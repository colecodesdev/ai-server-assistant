"use client";

import { useState } from "react";

export function QRActions({ chatUrl }: { chatUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chatUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="no-print mt-8 flex justify-center gap-4">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-[#c4956a] px-6 py-3 text-sm font-medium text-[#0a1628] transition-all hover:bg-[#d4a57a]"
      >
        Print QR Code
      </button>
      <button
        onClick={handleCopy}
        className="rounded-lg border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:text-white/70"
      >
        {copied ? "Copied!" : "Copy URL"}
      </button>
    </div>
  );
}
