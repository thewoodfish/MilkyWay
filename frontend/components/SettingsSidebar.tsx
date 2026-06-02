"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "General",       href: "/settings" },
  { label: "API Keys",      href: "/settings/api-keys" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "Billing",       href: "/settings/billing" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-60 flex-shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-3">
        Settings
      </p>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm mb-1 transition-colors duration-150 ${
              active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
