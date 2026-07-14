"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { api, type ChatMessage } from "@/lib/api";

export function ChatWindow({ scanId }: { scanId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getChatHistory(scanId)
      .then((res) => setMessages(res.messages))
      .catch(() => {
        // No history yet is a normal, expected state for a brand-new scan
      })
      .finally(() => setLoadingHistory(false));
  }, [scanId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const result = await api.sendChatMessage(scanId, trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          citations: result.citations,
          ts: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching the assistant. Try again in a moment.",
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-card border border-line bg-white flex flex-col h-[480px]">
      <div className="px-4 py-3 border-b border-line">
        <p className="text-sm font-medium text-ink">Ask about this result</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingHistory ? (
          <p className="text-sm text-sage-muted">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-sage-muted">
            Ask something like &quot;what does this finding mean?&quot; or &quot;how confident is
            this?&quot;
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  msg.role === "user" ? "bg-sage text-white" : "bg-sage-soft text-ink",
                ].join(" ")}
              >
                <p>{msg.content}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1">
                    {msg.citations.map((c, ci) => (
                      <span key={ci} className="text-xs opacity-75">
                        [{c.source}]
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-sage-soft rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 text-sage animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-line flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question about this scan…"
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:outline-none focus:border-sage"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-full bg-sage text-white p-2.5 disabled:opacity-40 hover:bg-[#4b5b4b] transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
