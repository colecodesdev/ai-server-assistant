"use client";

import { useEffect, useState, useCallback } from "react";

const cyclingPhrases = [
  "What's good tonight?",
  "What wine goes with that?",
  "Is this drink sweet?",
  "Is that the ocean?",
];

export default function Home() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const cyclePhrase = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setPhraseIndex((prev) => (prev + 1) % cyclingPhrases.length);
      setIsVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(cyclePhrase, 3000);
    return () => clearInterval(interval);
  }, [cyclePhrase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="flex flex-col text-center">
        {/* Branding */}
        <h1 className="uppercase mb-4 font-heading text-4xl font-medium tracking-tight text-white sm:text-5xl">
          Old Florida Fish House
        </h1>
        <p
          className={`mb-6 font-accent text-3xl font-medium tracking-[0.2em] text-[#c4956a]/70 transition-opacity duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {cyclingPhrases[phraseIndex]}
        </p>
        <a
          href="/chat"
          className="mx-auto mb-4 flex h-12 w-64 items-center justify-center rounded-xl bg-[#c4956a] text-sm font-bold text-[#0a1628] transition-all hover:bg-[#d4a57a] hover:shadow-lg hover:shadow-[#c4956a]/20"
        >
          Got Questions?
        </a>

        {/* Staff sign in */}
        <div className="flex flex-col items-center gap-3 sm:justify-center">
          <a
            href="/portal"
            className="flex h-12 w-64 items-center justify-center rounded-xl border border-white/10 text-sm font-bold text-white/50 transition-all hover:border-white/20 hover:text-white/70"
          >
            Explore Our Menu
          </a>
        </div>

      </div>
    </div>
  );
}
