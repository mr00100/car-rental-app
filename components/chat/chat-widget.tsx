"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, RotateCcw, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, availabilityLabel } from "@/lib/utils";

type VehicleCard = {
  name: string;
  brand: string;
  modelYear: number;
  transmission: string | null;
  seatingCapacity: number | null;
  dayPrice: number | null;
  minPrice: number | null;
  availability: string;
  href: string;
  coverImage: string | null;
};

type Msg = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  vehicles?: VehicleCard[];
  links?: { label: string; href: string }[];
  requiresAuth?: boolean;
};

const QUICK_ACTIONS = [
  { label: "🚗 Find a Vehicle", message: "Show me available cars" },
  { label: "📅 Help Me Book", message: "Help me book a vehicle" },
  { label: "❌ Cancel My Booking", message: "I want to cancel my booking" },
  { label: "👨‍✈️ Driver / Self-Drive", message: "What is self drive and do you provide drivers?" },
  { label: "🪪 Verification Help", message: "How do I complete identity verification?" },
  { label: "💳 Payment Help", message: "What payment methods do you accept?" },
  { label: "📋 My Booking Status", message: "What's my booking status?" },
  { label: "📍 Pickup Location", message: "Where do I pick up the car?" },
  { label: "👤 Contact Support", message: "I want to contact a human support agent" },
];

const AVAIL_DOT: Record<string, string> = {
  available: "bg-emerald-500",
  reserved: "bg-amber-500",
  rented: "bg-blue-500",
  maintenance: "bg-orange-500",
  disabled: "bg-slate-400",
};

const uid = () => Math.random().toString(36).slice(2);

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hide the greeting bubble shortly after load.
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const welcome = useCallback((): Msg => {
    return {
      id: uid(),
      sender: "assistant",
      text:
        "Hi! 👋 Welcome to our Rental Assistant.\n\nI can help you with:\n🚗 Finding a vehicle\n📅 Booking\n💳 Payments\n❌ Cancellation\n👨‍✈️ Driver or Self-Drive\n🪪 Identity verification\n📍 Pickup & Maps\n📋 Booking status\n\nHow can I help you?",
    };
  }, []);

  const openChat = () => {
    setOpen(true);
    setHasOpened(true);
    setShowBubble(false);
    if (messages.length === 0) setMessages([welcome()]);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const closeChat = () => setOpen(false);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, typing, scrollToBottom]);

  const send = useCallback(
    async (raw?: string) => {
      const message = (raw ?? input).trim();
      if (!message || typing) return;
      setInput("");
      setError(false);
      setMessages((m) => [
        ...m,
        { id: uid(), sender: "user", text: message },
      ]);
      setTyping(true);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Request failed");
        }
        const json = await res.json();
        const d = json.data;
        if (d.conversationId) setConversationId(d.conversationId);

        setMessages((m) => [
          ...m,
          {
            id: uid(),
            sender: "assistant",
            text: d.text,
            vehicles: d.vehicles,
            links: d.links,
            requiresAuth: d.requiresAuth,
          },
        ]);
      } catch {
        setError(true);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            sender: "assistant",
            text: "Sorry, I'm having trouble connecting right now. Please try again or contact our support team.",
            links: [
              { label: "Try Again", href: "#retry" },
              { label: "Contact Support", href: "/contact" },
            ],
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [input, typing, conversationId]
  );

  const restart = () => {
    setMessages([welcome()]);
    setConversationId(undefined);
    setError(false);
  };

  const handleLinkClick = (href: string) => {
    if (href === "#retry") {
      setMessages((m) => m.slice(0, -1));
      setError(false);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      {/* Floating launcher */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 print:hidden">
        {showBubble && !hasOpened && (
          <button
            onClick={openChat}
            className="rac-bubble-in hidden sm:flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium"
          >
            👋 Need help?
          </button>
        )}
        <button
          onClick={openChat}
          aria-label="Chat with us"
          className="rac-fab group flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-600/30 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12" />
          <span className="hidden sm:inline font-semibold text-sm">
            Chat with us
          </span>
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed z-[85] flex flex-col",
          "inset-0 sm:inset-auto sm:bottom-5 sm:right-5",
          "sm:w-[400px] sm:max-w-[calc(100vw-2.5rem)] sm:h-[620px] sm:max-h-[calc(100vh-7rem)]",
          "sm:rounded-3xl sm:overflow-hidden",
          "bg-white dark:bg-slate-900 sm:border sm:border-slate-200 dark:sm:border-slate-700 sm:shadow-2xl",
          "transition-all duration-300 ease-out origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
        role="dialog"
        aria-label="Support chat"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-700 to-brand-600 text-white px-4 py-3.5 shrink-0">
          <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center text-xl">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">Rental Assistant</p>
            <p className="text-xs text-brand-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </p>
          </div>
          <button
            onClick={restart}
            aria-label="Restart conversation"
            title="Restart conversation"
            className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimize"
            className="h-8 w-8 rounded-full hover:bg-white/15 items-center justify-center transition-colors hidden sm:flex"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={closeChat}
            aria-label="Close chat"
            className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 px-4 py-4 space-y-3"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onLinkClick={handleLinkClick} />
          ))}

          {typing && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 flex gap-1">
                <span className="rac-dot h-2 w-2 rounded-full bg-slate-400" />
                <span className="rac-dot h-2 w-2 rounded-full bg-slate-400 [animation-delay:0.2s]" />
                <span className="rac-dot h-2 w-2 rounded-full bg-slate-400 [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 1 && !typing && (
          <div className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-thin shrink-0 bg-slate-50 dark:bg-slate-950/40">
            {QUICK_ACTIONS.slice(0, 5).map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.message)}
                className="rac-chip whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-400 hover:text-brand-600 active:scale-95 transition-all"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              maxLength={600}
              className="flex-1 h-11 rounded-full bg-slate-100 dark:bg-slate-800 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 border border-transparent focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="h-11 w-11 shrink-0 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-90 group"
            >
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function MessageBubble({
  msg,
  onLinkClick,
}: {
  msg: Msg;
  onLinkClick: (href: string) => void;
}) {
  const isUser = msg.sender === "user";
  return (
    <div
      className={cn(
        "rac-msg-in flex items-end gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line break-words",
          isUser
            ? "rounded-br-md bg-brand-600 text-white"
            : "rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
        )}
      >
        {msg.text}

        {msg.vehicles && msg.vehicles.length > 0 && (
          <div className="mt-3 space-y-2">
            {msg.vehicles.map((v) => (
              <div
                key={v.href}
                className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <div className="flex gap-3 p-2">
                  <div className="h-14 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {v.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.coverImage}
                        alt={v.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xl">
                        🚗
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight truncate">
                      {v.brand} {v.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {v.modelYear}
                      {v.transmission ? ` • ${v.transmission}` : ""}
                      {v.seatingCapacity ? ` • ${v.seatingCapacity} Seats` : ""}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-brand-600 font-bold text-sm">
                        {formatCurrency(v.dayPrice ?? v.minPrice ?? 0)}
                        <span className="text-[10px] font-normal text-slate-400">
                          /day
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            AVAIL_DOT[v.availability] || AVAIL_DOT.disabled
                          )}
                        />
                        {availabilityLabel(v.availability)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-slate-100 dark:border-slate-700">
                  <Link
                    href={v.href}
                    onClick={() => onLinkClick(v.href)}
                    className="flex-1 text-center text-xs font-semibold py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    View
                  </Link>
                  <Link
                    href={`${v.href}?book=1`}
                    onClick={() => onLinkClick(v.href)}
                    className="flex-1 text-center text-xs font-semibold py-2 bg-brand-600 text-white hover:bg-brand-700"
                  >
                    Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {msg.links && msg.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.links.map((l) => (
              <Link
                key={l.label + l.href}
                href={l.href === "#retry" ? "#" : l.href}
                onClick={(e) => {
                  if (l.href === "#retry") e.preventDefault();
                  onLinkClick(l.href);
                }}
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900 hover:bg-brand-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
