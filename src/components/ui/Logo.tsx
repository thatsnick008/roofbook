import * as React from "react";

/** Simplistic Roofbook mark — a roofline over a ledger bar, reused everywhere the app shows its brand icon. */
export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Roofbook"
    >
      <defs>
        <linearGradient id="roofbook-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#roofbook-logo-g)" />
      <path fill="#fff" d="M256 96 116 200v216h96V300h88v116h96V200z" opacity=".95" />
      <rect x="236" y="330" width="40" height="86" rx="8" fill="#2563eb" opacity=".65" />
    </svg>
  );
}
