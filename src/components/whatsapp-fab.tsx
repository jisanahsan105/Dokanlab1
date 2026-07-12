import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X, CheckCheck, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ChatMsg = {
  id: string;
  sender: "customer" | "owner" | "system";
  message: string;
  seen: boolean;
  seen_at: string | null;
  created_at: string;
};

type Identity = { conversationId: string; name: string; phone: string; email: string };

function loadIdentity(slug: string): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`chat:${slug}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.conversationId) return null;
    return { conversationId: p.conversationId, name: p.name ?? "", phone: p.phone ?? "", email: p.email ?? "" };
  } catch { return null; }
}

function saveIdentity(slug: string, id: Identity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`chat:${slug}`, JSON.stringify(id));
}

function newUuid() {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID() as string;
  // Fallback (RFC4122-ish)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0; const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function WhatsAppFab({
  storeId,
  storeName,
  slug,
  brandColor,
}: {
  phone?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  message?: string;
  slug?: string;
  brandColor?: string;
}) {
  const storeSlug = slug ?? storeId ?? "";
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const primary = brandColor || "#2563EB";

  // Load saved identity on mount
  useEffect(() => {
    if (!storeSlug) return;
    const saved = loadIdentity(storeSlug);
    if (saved) setIdentity(saved);
  }, [storeSlug]);

  // Fetch + poll conversation
  const fetchMessages = async (id: Identity) => {
    if (!storeId) return;
    const { data, error } = await (supabase as any).rpc("chat_get_conversation", {
      _store_id: storeId, _conv_id: id.conversationId,
    });
    if (error) return;
    setMessages((data ?? []) as ChatMsg[]);
  };

  useEffect(() => {
    if (!identity || !storeId) return;
    fetchMessages(identity);
    const t = window.setInterval(() => fetchMessages(identity), 3500);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.conversationId, storeId]);

  // Auto-scroll when messages change or panel opens
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Mark owner messages as seen when panel is open
  useEffect(() => {
    if (!open || !identity || !storeId) return;
    const hasUnseenOwner = messages.some(m => m.sender === "owner" && !m.seen);
    if (!hasUnseenOwner) return;
    (async () => {
      await (supabase as any).rpc("chat_customer_mark_seen", { _store_id: storeId, _conv_id: identity.conversationId });
      fetchMessages(identity);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages, identity?.conversationId, storeId]);

  const unreadOwner = useMemo(() => messages.filter(m => m.sender === "owner" && !m.seen).length, [messages]);

  if (!storeId) return null;

  const startChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      return toast.error("Please enter your name and phone or email");
    }
    const id: Identity = { conversationId: newUuid(), name: name.trim(), phone: phone.trim(), email: email.trim() };
    saveIdentity(storeSlug, id);
    setIdentity(id);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !draft.trim() || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error } = await (supabase as any).rpc("chat_customer_send", {
      _store_id: storeId,
      _conv_id: identity.conversationId,
      _name: identity.name, _phone: identity.phone, _email: identity.email,
      _message: body,
    });
    setSending(false);
    if (error) { setDraft(body); return toast.error(error.message); }
    fetchMessages(identity);
  };

  const lastCustomerSeen = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "customer") return messages[i].seen ? messages[i].id : null;
    }
    return null;
  })();

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with store"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl"
        style={{ background: primary, boxShadow: `0 10px 30px -5px ${primary}88` }}
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-25" style={{ background: primary }} />
        <MessageCircle className="relative h-6 w-6" />
        {unreadOwner > 0 && (
          <span className="absolute -top-1 -right-1 grid h-6 min-w-[24px] place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow">
            {unreadOwner}
          </span>
        )}
      </motion.button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 sm:bg-transparent" onClick={() => setOpen(false)}>
          <div
            className="fixed bottom-0 right-0 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[560px] sm:max-h-[85vh] sm:w-[380px] sm:rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ background: primary }}>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{storeName ?? "Store"}</div>
                <div className="text-[11px] opacity-90">Typically replies within a few hours</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!identity ? (
              <form onSubmit={startChat} className="flex flex-1 flex-col justify-center gap-3 overflow-auto px-5 py-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Start a conversation</h3>
                  <p className="text-xs text-slate-500">The store will reply here. Save this page to continue the chat later.</p>
                </div>
                <div><Label className="text-slate-700">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></div>
                <div><Label className="text-slate-700">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></div>
                <div><Label className="text-slate-700">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                <Button type="submit" className="w-full text-white" style={{ background: primary }}>Start chat</Button>
                <p className="text-[10px] text-slate-400">Give either phone or email so the store can reach you.</p>
              </form>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4">
                  {messages.length === 0 && (
                    <div className="pt-10 text-center text-xs text-slate-400">Say hi to {storeName ?? "the store"} 👋</div>
                  )}
                  {messages.map(m => {
                    const mine = m.sender === "customer";
                    const sys = m.sender === "system";
                    if (sys) {
                      return (
                        <div key={m.id} className="mx-auto max-w-[85%] rounded-lg bg-amber-100 px-3 py-2 text-center text-[11px] text-amber-900">
                          {m.message}
                        </div>
                      );
                    }
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[80%]">
                          <div
                            className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "text-white rounded-br-sm" : "bg-white text-slate-900 rounded-bl-sm border border-slate-200"}`}
                            style={mine ? { background: primary } : undefined}
                          >
                            {m.message}
                          </div>
                          <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {mine && m.id === lastCustomerSeen && (
                              <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: primary }}>
                                <CheckCheck className="h-3 w-3" /> Seen
                              </span>
                            )}
                            {mine && m.id !== lastCustomerSeen && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 bg-white p-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                    rows={1}
                    placeholder="Write a message…"
                    className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                  <Button type="submit" size="icon" disabled={sending || !draft.trim()} className="h-10 w-10 shrink-0 text-white" style={{ background: primary }}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}