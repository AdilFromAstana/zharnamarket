import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { createSession } from "@/lib/sessions";
import { randomAvatarGradient } from "@/lib/utils";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface GoogleUserInfo {
  sub: string;        // Google ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Пользователь отменил авторизацию
  if (error) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=google_cancelled`);
  }

  // Проверяем state для защиты от CSRF
  const savedState = req.cookies.get("oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=google_csrf`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/auth/login?error=google_no_code`);
  }

  try {
    // 1. Обмениваем code на токены Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[Google OAuth] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/auth/login?error=google_token_failed`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    // 2. Получаем данные пользователя из Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error("[Google OAuth] UserInfo failed:", await userInfoRes.text());
      return NextResponse.redirect(`${appUrl}/auth/login?error=google_userinfo_failed`);
    }

    const googleUser = (await userInfoRes.json()) as GoogleUserInfo;

    if (!googleUser.email_verified) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=google_email_not_verified`);
    }

    // 3. Находим или создаём пользователя (с select для безопасности — без password)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.sub },
          { email: googleUser.email.toLowerCase() },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        avatarColor: true,
        role: true,
        googleId: true,
        blocked: true,
        isDeleted: true,
      },
    });

    if (user) {
      // Проверяем блокировку и удаление
      if (user.blocked) {
        return NextResponse.redirect(`${appUrl}/auth/login?error=account_blocked`);
      }
      if (user.isDeleted) {
        return NextResponse.redirect(`${appUrl}/auth/login?error=account_deleted`);
      }

      // Обновляем данные пользователя (googleId, аватар, emailVerified)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.sub,
          avatar: user.avatar ?? googleUser.picture ?? null,
          avatarColor: user.avatarColor ?? randomAvatarGradient(),
          name: user.name || googleUser.name,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          avatarColor: true,
          role: true,
          googleId: true,
          blocked: true,
          isDeleted: true,
        },
      });
    } else {
      // Создаём нового пользователя (Google = emailVerified)
      user = await prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          name: googleUser.name,
          avatar: googleUser.picture ?? null,
          avatarColor: randomAvatarGradient(),
          googleId: googleUser.sub,
          password: null,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          avatarColor: true,
          role: true,
          googleId: true,
          blocked: true,
          isDeleted: true,
        },
      });
    }

    // 4. Создаём собственные JWT токены
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    ]);

    // 5. Создаём серверную сессию
    await createSession(user.id, refreshToken, req);

    // 6. Редирект на success-страницу с cookies (БЕЗ токенов в URL)
    const redirectResponse = NextResponse.redirect(`${appUrl}/auth/google/success`);
    setAuthCookies(redirectResponse, accessToken, refreshToken);

    // Удаляем oauth_state cookie
    redirectResponse.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });

    return redirectResponse;
  } catch (err) {
    console.error("[Google OAuth callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/auth/login?error=google_server_error`);
  }
}
