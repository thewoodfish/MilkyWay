import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden text-white pt-16 pb-10 px-6"
      style={{
        background: "linear-gradient(180deg, #040e24 0%, #020912 100%)",
        borderTop: "1px solid rgba(59,130,246,0.12)",
      }}
    >
      {/* Subtle blue glow top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-80px",
          left: "-60px",
          width: "420px",
          height: "300px",
          background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-[1200px] mx-auto relative z-10">

        {/* Top: brand + links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <Image src="/logo-2.png" alt="MilkyWay" width={140} height={37} />
            </div>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#ffffff" }}>
              The universe of autonomous agents.
              <br />Built on Arbitrum. Open protocol.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {["ERC-8004", "x402", "Arbitrum"].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono-custom font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {[
            {
              title: "Product",
              links: [
                { label: "Browse agents", href: "/agents" },
                { label: "Register agent", href: "/register" },
              ],
            },
            {
              title: "Developers",
              links: [
                { label: "Documentation", href: "https://docs.usemilkyway.com" },
                { label: "Protocol spec", href: "https://docs.usemilkyway.com/protocol/overview" },
                { label: "GitHub", href: "https://github.com/thewoodfish/MilkyWay" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-4"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] transition-colors text-[#ffffff] hover:text-white"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13px] transition-colors text-[#ffffff] hover:text-white"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-8" style={{ background: "rgba(59,130,246,0.12)" }} />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.8)" }}
            />
            <p className="text-[12px] font-mono-custom" style={{ color: "#ffffff" }}>
              © 2026 MilkyWay · 1% protocol fee · Arbitrum One
            </p>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Terms", href: "/terms" },
              { label: "Privacy", href: "/privacy" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[12px] transition-colors text-[#ffffff] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://github.com/thewoodfish/MilkyWay"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors text-[#ffffff] hover:text-white"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
