import type { SessionOptions } from "iron-session";

export interface SessionData {
  nonce?: string;
  address?: string;
  chainId?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "milkyway_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
