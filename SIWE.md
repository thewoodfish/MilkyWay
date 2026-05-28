# SIWE.md — Sign-In With Ethereum
## Authentication Spec for MilkyWay

This file defines the complete authentication system for MilkyWay.
Read this alongside MILKYWAY_PHASE1.md before implementing any auth logic.

---

## The Model

No emails. No passwords. No OAuth.
A wallet address IS the user's identity.
Ownership is proven by signing a message — no gas, no transaction.

```
Connect Wallet  → we know WHO you are (address)
Sign Message    → we know you OWN that wallet (SIWE)
JWT issued      → all protected API calls use this token
```

---

## What Requires Auth

```
Public — no wallet, no auth:
  GET  /api/agents          browse all agents
  GET  /api/agents/:id      view agent profile
  GET  /api/stats           platform stats

Wallet connected (address known, no signature needed):
  POST /api/agents/register  step 1 — pre-verify endpoint
                             (address passed in body, not yet proven)

Signed in (SIWE verified, JWT required):
  POST /api/agents/confirm   activate agent after tx confirms
  PUT  /api/agents/:id       edit agent metadata
  DELETE /api/agents/:id     deactivate agent
  GET  /api/dashboard        builder's own agents
```

---

## Libraries

```bash
# Backend
npm install siwe iron-session

# Frontend (already in stack via wagmi)
npm install siwe
# wagmi has useSignMessage built in — use that
```

---

## Backend Implementation

### backend/src/lib/session.ts

```typescript
import { IronSessionOptions } from "iron-session";

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET!,  // min 32 chars random string
  cookieName: "milkyway_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax"
  }
};

// Extend the session type
declare module "iron-session" {
  interface IronSessionData {
    nonce?: string;
    address?: string;      // verified wallet address
    chainId?: number;
  }
}
```

### backend/src/routes/auth.ts

```typescript
import { Router, Request, Response } from "express";
import { SiweMessage, generateNonce } from "siwe";
import { getIronSession } from "iron-session";
import { sessionOptions } from "../lib/session";
import jwt from "jsonwebtoken";

const router = Router();

// GET /api/auth/nonce
// Frontend calls this first to get a fresh nonce
router.get("/nonce", async (req: Request, res: Response) => {
  const session = await getIronSession(req, res, sessionOptions);
  session.nonce = generateNonce();
  await session.save();
  res.json({ nonce: session.nonce });
});

// POST /api/auth/verify
// Frontend sends signed SIWE message + signature
router.post("/verify", async (req: Request, res: Response) => {
  const { message, signature } = req.body;

  if (!message || !signature) {
    return res.status(400).json({ error: "Missing message or signature" });
  }

  const session = await getIronSession(req, res, sessionOptions);

  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({
      signature,
      nonce: session.nonce,   // must match what we issued
      domain: process.env.DOMAIN || "localhost"
    });

    if (!result.success) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    const address = result.data.address;
    const chainId = result.data.chainId;

    // Clear nonce — one use only
    session.nonce = undefined;
    session.address = address;
    session.chainId = chainId;
    await session.save();

    // Issue JWT for API calls
    const token = jwt.sign(
      { address, chainId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({ success: true, address, token });

  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
// Check if currently signed in
router.get("/me", authenticateJWT, (req: Request, res: Response) => {
  res.json({ address: (req as any).user.address });
});

export default router;
```

### backend/src/middleware/auth.ts

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      address: string;
      chainId: number;
    };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Use on protected routes:
// router.put("/:agentId", authenticateJWT, async (req, res) => { ... })

// Inside protected route, verify ownership:
// if (req.user.address.toLowerCase() !== agent.ownerAddress.toLowerCase()) {
//   return res.status(403).json({ error: "Not your agent" })
// }
```

---

## Frontend Implementation

### frontend/lib/auth.ts

```typescript
import { SiweMessage } from "siwe";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Step 1: Get nonce from backend
export async function getNonce(): Promise<string> {
  const res = await fetch(`${API}/api/auth/nonce`, {
    credentials: "include"
  });
  const data = await res.json();
  return data.nonce;
}

// Step 2: Build the SIWE message
export function buildSiweMessage(
  address: string,
  chainId: number,
  nonce: string
): string {
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Sign in to MilkyWay. This request will not trigger a blockchain transaction or cost any gas fees.",
    uri: window.location.origin,
    version: "1",
    chainId,
    nonce
  });
  return message.prepareMessage();
}

// Step 3: Verify signature with backend, get JWT
export async function verifySignature(
  message: string,
  signature: string
): Promise<{ address: string; token: string }> {
  const res = await fetch(`${API}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, signature })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Sign in failed");
  }

  return res.json();
}

// Store JWT in memory (not localStorage — XSS risk)
// Use React context or Zustand for this
let _token: string | null = null;
export const setToken = (t: string) => { _token = t; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };

// Helper for authenticated API calls
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}
```

### frontend/components/SignInButton.tsx

```typescript
"use client";

import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useState } from "react";
import { getNonce, buildSiweMessage, verifySignature, setToken } from "@/lib/auth";

interface Props {
  onSignedIn: (address: string) => void;
}

export function SignInButton({ onSignedIn }: Props) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get nonce
      const nonce = await getNonce();

      // 2. Build message
      const message = buildSiweMessage(address, chainId, nonce);

      // 3. Sign with wallet (MetaMask popup — no gas)
      const signature = await signMessageAsync({ message });

      // 4. Verify with backend, get JWT
      const { token } = await verifySignature(message, signature);

      // 5. Store token in memory
      setToken(token);
      onSignedIn(address);

    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={loading || !address}
      >
        {loading ? "Signing..." : "Sign In With Wallet"}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
```

### frontend/context/AuthContext.tsx

```typescript
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { clearToken, getToken } from "@/lib/auth";

interface AuthState {
  address: string | null;
  isSignedIn: boolean;
  token: string | null;
  signOut: () => void;
  setSignedIn: (address: string) => void;
}

const AuthContext = createContext<AuthState>({
  address: null,
  isSignedIn: false,
  token: null,
  signOut: () => {},
  setSignedIn: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const { disconnect } = useDisconnect();
  const { address: walletAddress } = useAccount();

  // If wallet disconnects, sign out too
  useEffect(() => {
    if (!walletAddress && address) {
      signOut();
    }
  }, [walletAddress]);

  function setSignedIn(addr: string) {
    setAddress(addr);
  }

  function signOut() {
    clearToken();
    setAddress(null);
    disconnect();
  }

  return (
    <AuthContext.Provider value={{
      address,
      isSignedIn: !!address,
      token: getToken(),
      signOut,
      setSignedIn
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## Auth Flow in the Register Page

The registration page uses auth in two places:

```typescript
// Step 1 — wallet connected (no signature yet)
// Just show the form, pass address in the body
const { address } = useAccount();

// Step 4 — before confirm call (signature required)
// User must be signed in to call /api/agents/confirm
const { isSignedIn } = useAuth();

if (!isSignedIn) {
  // Show SignInButton before allowing confirm
}

// Then call confirm with JWT
await authFetch(`${API}/api/agents/confirm`, {
  method: "POST",
  body: JSON.stringify({ profileId, agentId, txHash })
});
```

---

## Environment Variables to Add

```bash
# backend/.env
SESSION_SECRET=<random 32+ char string>   # openssl rand -base64 32
JWT_SECRET=<random 32+ char string>        # openssl rand -base64 32
DOMAIN=localhost                            # milkyway.xyz in production

# frontend/.env.local
# Nothing extra needed — uses NEXT_PUBLIC_API_URL already defined
```

---

## Security Rules — Never Break These

- **Never store JWT in localStorage.** XSS can steal it. Store in memory (React context).
- **Never skip nonce verification on the backend.** Replay attacks are real.
- **Always compare addresses case-insensitively.** `address.toLowerCase()` on both sides.
- **Always verify the signer owns the agent** before allowing edit/deactivate. Check `ownerAddress` in Postgres AND `ownerOf(agentId)` on-chain.
- **Nonce is single use.** Clear it from the session immediately after verification.
- **JWT expires in 7 days.** User signs in again after expiry. This is normal.

---

*MilkyWay SIWE Authentication — Part of Phase 1*