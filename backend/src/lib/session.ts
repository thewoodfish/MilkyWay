import type { IronSessionOptions } from "iron-session";

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "milkyway_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

declare module "iron-session" {
  interface IronSessionData {
    nonce?: string;
    address?: string;
    chainId?: number;
  }
}
