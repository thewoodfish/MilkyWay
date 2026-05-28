import { SiweMessage } from "siwe";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getNonce(): Promise<string> {
  const res = await fetch(`${API}/api/auth/nonce`, { credentials: "include" });
  const data = await res.json();
  return data.nonce;
}

export function buildSiweMessage(address: string, chainId: number, nonce: string): string {
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Sign in to MilkyWay. This request will not trigger a blockchain transaction or cost any gas fees.",
    uri: window.location.origin,
    version: "1",
    chainId,
    nonce,
  });
  return message.prepareMessage();
}

export async function verifySignature(
  message: string,
  signature: string
): Promise<{ address: string; token: string }> {
  const res = await fetch(`${API}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Sign in failed");
  }
  return res.json();
}

// JWT stored in memory only — never localStorage (XSS risk)
let _token: string | null = null;
export const setToken = (t: string) => { _token = t; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
