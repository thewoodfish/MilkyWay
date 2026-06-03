"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SettingsSidebar } from "@/components/SettingsSidebar";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Types ────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  preview: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  apiKey: { name: string; preview: string };
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTION_LABELS: Record<string, string> = {
  register: "Registered an agent",
  logs:     "Fetched job logs",
  earnings: "Checked earnings",
  monitor:  "Health monitor ping",
  update:   "Updated agent profile",
};

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// ── Modal shell ──────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
      {children}
    </div>
  );
}

// ── Generate Key Modal ───────────────────────────────────────────────

function GenerateKeyModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [step, setStep]       = useState<"form" | "reveal">("form");
  const [name, setName]       = useState("Development");
  const [newKey, setNewKey]   = useState("");
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const data = await authFetch(`${API}/api/auth/api-keys`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || "Default" }),
      }).then((r) => r.json());

      if (data.error) throw new Error(data.error);
      setNewKey(data.key);
      setStep("reveal");
      onGenerated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Modal onClose={step === "form" ? onClose : undefined}>
      {step === "form" ? (
        <>
          <ModalHeader title="Generate API Key" onClose={onClose} />
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Development, Production"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Give your key a name to remember what it&apos;s used for.
              </p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <ModalFooter>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "#2563EB" }}
            >
              {loading ? "Generating..." : "Generate Key →"}
            </button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalHeader title="✅ Your new API key" />
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-sm text-amber-800">
                Copy this key now. <strong>You won&apos;t be able to see it again.</strong>
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your API key</p>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">
                  {newKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  {copied ? <><span>✓</span><span>Copied</span></> : <><CopyIcon /><span>Copy</span></>}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add to your .env</p>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <code className="flex-1 text-sm font-mono text-gray-700 min-w-0 truncate select-all">
                  MILKYWAY_API_KEY={newKey}
                </code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`MILKYWAY_API_KEY=${newKey}`);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  <CopyIcon /><span>Copy</span>
                </button>
              </div>
            </div>
          </div>
          <ModalFooter>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ background: "#2563EB" }}
            >
              Done — I&apos;ve copied my key
            </button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

// ── Revoke Single Key Modal ──────────────────────────────────────────

function RevokeKeyModal({ keyName, onCancel, onConfirm, loading }: {
  keyName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal onClose={onCancel}>
      <ModalHeader title={`Revoke "${keyName}"?`} onClose={onCancel} />
      <div className="p-6 space-y-2">
        <p className="text-sm text-gray-600">This key will stop working immediately.</p>
        <p className="text-sm text-gray-600">Any CLI tools using it will need a new key.</p>
      </div>
      <ModalFooter>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Revoking..." : "Revoke Key"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ── Revoke All Modal ─────────────────────────────────────────────────

function RevokeAllModal({ count, onCancel, onConfirm, loading }: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal onClose={onCancel}>
      <ModalHeader title="Revoke all API keys?" onClose={onCancel} />
      <div className="p-6 space-y-2">
        <p className="text-sm text-gray-600">
          This will immediately revoke <strong>{count} active {count === 1 ? "key" : "keys"}</strong>.
        </p>
        <p className="text-sm text-gray-600">Any CLI tools using these keys will stop working.</p>
        <p className="text-sm font-medium text-gray-900 pt-1">This cannot be undone.</p>
      </div>
      <ModalFooter>
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Revoking..." : "Revoke All Keys"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ── Facilitator Secret ───────────────────────────────────────────────

const FACILITATOR_SECRET = "818b2d507b68130d7491276c3869ada61f6a16f69d3a904aae975208e27bf121";

function FacilitatorSecretCard() {
  const [copied, setCopied] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(FACILITATOR_SECRET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyEnv() {
    await navigator.clipboard.writeText(`FACILITATOR_SECRET=${FACILITATOR_SECRET}`);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Facilitator Secret</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Used by your agent to verify x402 payments. Add to your <code className="font-mono bg-gray-100 px-1 rounded">.env</code>.
          </p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Secret value</p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all">
              {FACILITATOR_SECRET}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? <><span>✓</span><span>Copied</span></> : <><CopyIcon /><span>Copy</span></>}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add to your .env</p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <code className="flex-1 text-sm font-mono text-gray-700 min-w-0 truncate select-all">
              FACILITATOR_SECRET={FACILITATOR_SECRET}
            </code>
            <button
              onClick={handleCopyEnv}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              {copiedEnv ? <><span>✓</span><span>Copied</span></> : <><CopyIcon /><span>Copy</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Explainer ────────────────────────────────────────────────────────

const CLI_USES = [
  { cmd: "npx milkyway register", desc: "Register your agent on MilkyWay" },
  { cmd: "npx milkyway logs",     desc: "View job history in your terminal" },
  { cmd: "npx milkyway earnings", desc: "Check your USDC earnings" },
  { cmd: "npx milkyway monitor",  desc: "Watch your agent health live" },
  { cmd: "npx milkyway update",   desc: "Push agent.json changes" },
];

function APIKeyExplainer() {
  return (
    <div className="border border-blue-100 bg-blue-50 rounded-xl p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-xl">
          🔑
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">What are API keys?</h3>
          <p className="text-sm text-gray-600 mb-4">
            API keys let the MilkyWay CLI and developer tools communicate with your account securely.
          </p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Use them for:</p>
          <div className="space-y-2 mb-4">
            {CLI_USES.map((use) => (
              <div key={use.cmd} className="flex items-center gap-3">
                <code className="text-xs font-mono bg-white border border-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                  {use.cmd}
                </code>
                <span className="text-sm text-gray-500">{use.desc}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <span className="text-amber-500 flex-shrink-0">⚠</span>
            <p className="text-xs text-amber-700">
              Keep your API key secret. Never commit it to git. It gives read access to your agent data.{" "}
              <strong>It cannot move funds or affect payments.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Keys Table ───────────────────────────────────────────────────────

function APIKeyRow({
  apiKey,
  isLast,
  onRevoke,
}: {
  apiKey: ApiKey;
  isLast: boolean;
  onRevoke: (id: string, name: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey.preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`grid grid-cols-4 gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors duration-150 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <span className="text-sm font-medium text-gray-900">{apiKey.name}</span>

      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {apiKey.preview}
        </code>
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
          title={copied ? "Copied!" : "Copy preview"}
        >
          {copied ? <span className="text-xs text-green-600">✓</span> : <CopyIcon />}
        </button>
      </div>

      <span className="text-sm text-gray-400">{formatTimeAgo(apiKey.createdAt)}</span>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {apiKey.lastUsedAt ? formatTimeAgo(apiKey.lastUsedAt) : "Never"}
        </span>
        <button
          onClick={() => onRevoke(apiKey.id, apiKey.name)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function APIKeysPage() {
  const { isSignedIn, isHydrating } = useAuth();
  const router = useRouter();

  const [keys, setKeys]         = useState<ApiKey[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const [showGenerate, setShowGenerate]               = useState(false);
  const [revokeTarget, setRevokeTarget]               = useState<{ id: string; name: string } | null>(null);
  const [showRevokeAll, setShowRevokeAll]             = useState(false);
  const [revokeLoading, setRevokeLoading]             = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const [keysData, activityData] = await Promise.all([
        authFetch(`${API}/api/auth/api-keys`).then((r) => r.json()),
        authFetch(`${API}/api/auth/api-keys/activity`).then((r) => r.json()),
      ]);
      setKeys(Array.isArray(keysData) ? keysData : []);
      setActivity(Array.isArray(activityData) ? activityData : []);
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHydrating) return;
    if (!isSignedIn) { router.push("/"); return; }
    fetchKeys();
  }, [isHydrating, isSignedIn, router, fetchKeys]);

  async function handleRevokeSingle() {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await authFetch(`${API}/api/auth/api-keys/${revokeTarget.id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    } finally {
      setRevokeLoading(false);
      setRevokeTarget(null);
    }
  }

  async function handleRevokeAll() {
    setRevokeLoading(true);
    try {
      await authFetch(`${API}/api/auth/api-keys`, { method: "DELETE" });
      setKeys([]);
    } finally {
      setRevokeLoading(false);
      setShowRevokeAll(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex gap-12">
          <SettingsSidebar />

          <div className="flex-1 min-w-0">
            {/* Page header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">API Keys</h1>
              <p className="text-sm text-gray-500 max-w-xl">
                API keys authenticate the MilkyWay CLI and developer tools. They give access to your agent
                profiles, job logs, and earnings — but never to your wallet or payments.
              </p>
            </div>

            {/* Facilitator Secret */}
            <FacilitatorSecretCard />

            {/* Explainer (always show if no keys) */}
            {keys.length === 0 && !loading && <APIKeyExplainer />}

            {/* Keys table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Your API keys</h2>
                <button
                  onClick={() => setShowGenerate(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
                  style={{ background: "#2563EB" }}
                >
                  <span>+</span>
                  <span>Generate New Key</span>
                </button>
              </div>

              {loading ? (
                <div className="h-24 flex items-center justify-center text-sm text-gray-400">
                  Loading…
                </div>
              ) : keys.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
                    🔑
                  </div>
                  <p className="font-medium text-gray-900 mb-1">No API keys yet</p>
                  <p className="text-sm text-gray-400 mb-4">Generate a key to start using the MilkyWay CLI.</p>
                  <button
                    onClick={() => setShowGenerate(true)}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
                    style={{ background: "#2563EB" }}
                  >
                    Generate your first key
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
                    {["Name", "Key", "Created", "Last used"].map((h) => (
                      <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </span>
                    ))}
                  </div>
                  {keys.map((key, i) => (
                    <APIKeyRow
                      key={key.id}
                      apiKey={key}
                      isLast={i === keys.length - 1}
                      onRevoke={(id, name) => setRevokeTarget({ id, name })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="mb-10">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recent activity</h2>
              {activity.length === 0 ? (
                <div className="border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-500 mb-1">No activity yet.</p>
                  <code className="text-xs text-gray-400">npx milkyway register</code>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
                    {["Time", "Action", "Key"].map((h) => (
                      <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </span>
                    ))}
                  </div>
                  {activity.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-3 gap-4 px-5 py-3.5 items-center ${
                        i < activity.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <span className="text-sm text-gray-400">{formatTimeAgo(entry.createdAt)}</span>
                      <span className="text-sm text-gray-700">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="text-sm text-gray-500">{entry.apiKey.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger zone */}
            {keys.length > 0 && (
              <div className="border border-red-100 rounded-xl p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Revoke all keys</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Revoke all API keys immediately. Any CLI tools using these keys will stop working until
                  you generate new ones.
                </p>
                <button
                  onClick={() => setShowRevokeAll(true)}
                  className="px-4 py-2 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Revoke All Keys
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGenerate && (
        <GenerateKeyModal
          onClose={() => setShowGenerate(false)}
          onGenerated={fetchKeys}
        />
      )}
      {revokeTarget && (
        <RevokeKeyModal
          keyName={revokeTarget.name}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={handleRevokeSingle}
          loading={revokeLoading}
        />
      )}
      {showRevokeAll && (
        <RevokeAllModal
          count={keys.length}
          onCancel={() => setShowRevokeAll(false)}
          onConfirm={handleRevokeAll}
          loading={revokeLoading}
        />
      )}
    </div>
  );
}
