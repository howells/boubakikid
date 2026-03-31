"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/heartbeat", label: "Heartbeat" },
  { href: "/anatomy", label: "Anatomy" },
  { href: "/bubbles", label: "Bubbles" },
  { href: "/river", label: "River" },
  { href: "/heatmap", label: "Heatmap" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-[var(--background)]/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-6">
        <Link
          href="/"
          className="font-semibold text-sm tracking-tight hover:text-white transition-colors"
        >
          boubakikid
        </Link>
        <div className="flex gap-4 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? "text-white"
                  : "text-[var(--muted)] hover:text-neutral-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
