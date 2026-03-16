"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";

// ─── Types ──────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

interface ChatInterfaceProps {
  mode: "guest" | "staff";
}

// ─── Suggestion chips per mode ──────────────────────────

const GUEST_STARTERS = [
  "What's gluten-free?",
  "Tell me about the sushi menu",
  "What wine pairs with fish?",
  "What are your appetizers?",
];

const STAFF_STARTERS = [
  "Prep notes for the seafood tower",
  "Upsell suggestions for sushi table",
  "What's in the miso glaze?",
  "Allergen info for the Dragon Roll",
];

// ─── Component ──────────────────────────────────────────

export function ChatInterface({ mode }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const starters = mode === "guest" ? GUEST_STARTERS : STAFF_STARTERS;

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      setStreamingContent("");

      // Build conversation history from existing messages (not including the new user message)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory,
            mode,
            stream: true,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          const status = res.status;
          let errorContent: string;
          if (status === 429) {
            errorContent = "You're sending messages too quickly. Please wait a moment and try again.";
          } else if (status === 401) {
            errorContent = "Please sign in to use staff mode.";
          } else if (status === 503) {
            errorContent = "Our assistant is having trouble right now. Please try again in a moment.";
          } else {
            errorContent = err?.error ?? "Something went wrong. Please try again.";
          }
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: errorContent, isError: true },
          ]);
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6);

              try {
                const event = JSON.parse(json);

                if (event.type === "delta") {
                  accumulated += event.text;
                  setStreamingContent(accumulated);
                } else if (event.type === "done") {
                  setMessages((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), role: "assistant", content: accumulated },
                  ]);
                  setStreamingContent("");
                  setIsLoading(false);
                  return;
                } else if (event.type === "error") {
                  throw new Error(event.text);
                }
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }
          }
        } catch {
          // Stream dropped mid-response — commit partial content
          if (accumulated) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: accumulated + "\n\n_(response may be incomplete)_",
              },
            ]);
            setStreamingContent("");
            setIsLoading(false);
            return;
          }
          throw new Error("Connection lost. Please try again.");
        }

        // Stream ended without done event — commit what we have
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: accumulated + "\n\n_(response may be incomplete)_",
            },
          ]);
        }
        setStreamingContent("");
        setIsLoading(false);
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: errorText,
            isError: true,
          },
        ]);
        setStreamingContent("");
        setIsLoading(false);
      }
    },
    [isLoading, messages, mode]
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0 && !streamingContent;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Message list ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
        {isEmpty && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="mb-3 text-3xl">🐟</div>
            <h2 className="mb-1 font-heading text-lg font-light text-white">
              {mode === "guest" ? "Menu Assistant" : "Staff Assistant"}
            </h2>
            <p className="mb-6 max-w-xs text-center text-sm text-white/40">
              {mode === "guest"
                ? "Ask about our menu, allergens, pairings, or our story."
                : "Prep notes, upsell tips, allergen info, and more."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
              {msg.role === "user" ? "You" : "OFHS Assistant"}
            </span>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm bg-[#c4956a] text-[#0a1628]"
                  : msg.isError
                    ? "rounded-bl-sm border border-red-500/20 bg-red-500/10 text-red-300"
                    : "rounded-bl-sm bg-white/10 text-white"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingContent && (
          <div className="mb-3 flex flex-col items-start">
            <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
              OFHS Assistant
            </span>
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5 text-sm leading-relaxed text-white">
              {streamingContent}
              <span className="ml-0.5 inline-block animate-pulse">▍</span>
            </div>
          </div>
        )}

        {/* Loading indicator when waiting for first token */}
        {isLoading && !streamingContent && (
          <div className="mb-3 flex flex-col items-start">
            <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
              OFHS Assistant
            </span>
            <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5 text-sm text-white/50">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion chips (empty state) ───────────────── */}
      {isEmpty && (
        <div className="flex flex-wrap justify-center gap-2 px-4 pb-3">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-[#c4956a]/30 hover:text-white/80"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ───────────────────────────────────── */}
      <div className="border-t border-white/10 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setTimeout(() => inputRef.current?.scrollIntoView({ block: "end" }), 300);
            }}
            placeholder={
              mode === "guest"
                ? "Ask about our menu..."
                : "Ask about menu, prep, upsells..."
            }
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-[#c4956a] px-5 py-3 text-sm font-medium text-[#0a1628] transition-all hover:bg-[#d4a57a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
