import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Building2,
  TrendingUp,
  MapPin,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  { icon: Building2, label: "What apartments are available in New Cairo?" },
  { icon: TrendingUp, label: "How are property prices trending in Sheikh Zayed?" },
  { icon: MapPin, label: "Find me a 3-bedroom apartment in 5th Settlement under 5M EGP" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // Backend Base URL: http://127.0.0.1:8010 — via Vite proxy /api/agent -> 8010
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: text.trim(),
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) throw new Error("Failed to get response");

        const data = await res.json();
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "I couldn't process that request.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I'm sorry, I encountered an error. Please try again later.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (label: string) => {
    sendMessage(label);
  };

  return (
    <section className="py-16 max-md:py-10">
      <div className="mx-auto max-w-[900px] px-8 max-md:px-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-text-secondary">
              AI-Powered
            </span>
          </div>
          <h1 className="text-[44px] font-bold leading-[1.08] tracking-tight max-md:text-[32px]">
            Real Estate AI Assistant
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Ask anything about Egyptian real estate. Our AI knows the market.
          </p>
        </motion.div>

        {/* Chat Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="overflow-hidden rounded-[22px] border border-border bg-card"
        >
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 max-md:h-[400px] max-md:p-4">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Bot className="size-7 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-medium text-text-secondary">
                    How can I help you today?
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Ask about properties, prices, or neighborhoods
                  </p>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-4 flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed max-md:text-[13px] ${
                      msg.role === "user"
                        ? "bg-primary/15 text-text"
                        : "border border-border bg-bg/60 text-text-secondary"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <User className="size-4 text-text-muted" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 flex gap-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg/60 px-4 py-3">
                    <Loader2 className="size-4 text-primary animate-spin" />
                    <span className="text-sm text-text-muted">Thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-border px-6 py-4 max-md:px-4 scrollbar-none">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.label)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-text"
                >
                  <s.icon className="size-3.5" strokeWidth={1.75} />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-border p-4 max-md:p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about properties, prices, locations..."
              className="h-12 flex-1 rounded-xl border border-border bg-bg/60 px-4 text-sm text-text outline-none transition-all duration-200 placeholder:text-text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/20 max-md:h-11 max-md:text-[13px]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-bg transition-all duration-200 hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed max-md:size-11"
            >
              <Send className="size-5" />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
