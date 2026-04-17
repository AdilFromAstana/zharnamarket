import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

/**
 * GET /api/auth/google/link/callback
 * Callback for Google account linking.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = `${appUrl}/cabinet/settings`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?link_error=google_cancelled`);
  }

  // Verify state
  const savedState = req.cookies.get("oauth_link_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${settingsUrl}?link_error=google_csrf`);
  }

  // Decode state to get userId
  let stateData: { action: string; userId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${settingsUrl}?link_error=invalid_state`);
  }

  if (stateData.action !== "link" || !stateData.userId) {
    return NextResponse.redirect(`${settingsUrl}?link_error=invalid_state`);
  }

  // Also verify via JWT cookie that the user is still authenticated
  const currentUserId = await getCurrentUserId(req);
  if (!currentUserId || currentUserId !== stateData.userId) {
    return NextResponse.redirect(`${settingsUrl}?link_error=auth_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?link_error=no_code`);
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI_LINK ?? process.env.GOOGLE_REDIRECT_URI;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${settingsUrl}?link_error=token_failed`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    // Get Google user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${settingsUrl}?link_error=userinfo_failed`);
    }

    const googleUser = (await userInfoRes.json()) as GoogleUserInfo;

    // Check if this Google account is already linked to another user
    const existingGoogleUser = await prisma.user.findUnique({
      where: { googleId: googleUser.sub },
      select: { id: true },
    });

    if (existingGoogleUser && existingGoogleUser.id !== currentUserId) {
      return NextResponse.redirect(`${settingsUrl}?link_error=google_already_linked`);
    }

    // Link Google to current user
    await prisma.user.update({
      where: { id: currentUserId },
      data: { googleId: googleUser.sub },
    });

    // Clean up state cookie
    const response = NextResponse.redirect(`${settingsUrl}?link_success=google`);
    response.cookies.set("oauth_link_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[Google Link Callback] Error:", err);
    return NextResponse.redirect(`${settingsUrl}?link_error=server_error`);
  }
}
