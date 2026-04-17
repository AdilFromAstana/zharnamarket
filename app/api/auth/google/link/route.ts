import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

/**
 * GET /api/auth/google/link
 * Initiates Google OAuth for LINKING to existing account.
 * Same as /api/auth/google but state includes action=link + userId.
 */
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI_LINK ?? process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth не настроен" },
      { status: 500 },
    );
  }

  const state = JSON.stringify({
    action: "link",
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
  });
  const stateB64 = Buffer.from(state).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: stateB64,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const response = NextResponse.redirect(googleAuthUrl);

  response.cookies.set("oauth_link_state", stateB64, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
