import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCheck, Check, Mail, MessageCircle, Phone, Search, Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/messages")({ component: MessagesPage });

type StoreMessage = {
  id: string;
  store_id: string | null;
  user_id: string | null;
  conversation_id: string | null;
  sender: "customer" | "owner" | "system";
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  message: string;
  source: string;
  seen: boolean;
  seen_at: string | null;
  created_at: string;
};

type Conversation = {
  key: string; // conversation_id or fallback id
  conversationId: string | null;
  storeId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  lastMessage: StoreMessage;
  messages: StoreMessage[];
  unread: number;
};

function MessagesPage() {
  const { user } = useAuth();
  const { store } = useMyStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<StoreMessage[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async (adminOverride = isAdmin) => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("store_messages").select("*").order("created_at", { ascending: false });
    if (!adminOverride) {
      const orParts = [`user_id.eq.${user.id}`];
      if (store) orParts.push(`store_id.eq.${store.id}`);
      q = q.or(orParts.join(","));
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setMessages((data ?? []) as StoreMessage[]);
    if (adminOverride) {
      const ids = Array.from(new Set((data ?? []).map((m: any) => m.store_id).filter(Boolean)));
      if (ids.length) {
        const { data: stores } = await supabase.from("stores").select("id,name").in("id", ids);
        const names: Record<string, string> = {};
        (stores ?? []).forEach((s: any) => { names[s.id] = s.name; });
        setStoreNames(names);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin");
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      await load(admin);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, store?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`store-messages-page-${store?.id ?? "admin"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, store?.id, isAdmin]);

  // Group messages into conversations (by conversation_id; fallback to individual id for legacy rows without one)
  const conversations: Conversation[] = useMemo(() => {
    const map = new Map<string, Conversation>();
    // Iterate oldest-first so lastMessage ends up as newest
    const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const m of sorted) {
      const key = m.conversation_id ?? `single:${m.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.messages.push(m);
        existing.lastMessage = m;
        if (m.sender === "customer" && !m.seen) existing.unread += 1;
        // Prefer non-null identity fields
        existing.customerName ||= m.customer_name;
        existing.customerPhone ||= m.customer_phone;
        existing.customerEmail ||= m.customer_email;
      } else {
        map.set(key, {
          key,
          conversationId: m.conversation_id,
          storeId: m.store_id,
          customerName: m.customer_name,
          customerPhone: m.customer_phone,
          customerEmail: m.customer_email,
          lastMessage: m,
          messages: [m],
          unread: m.sender === "customer" && !m.seen ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastMessage.created_at.localeCompare(a.lastMessage.created_at));
  }, [messages]);

  const filteredConvs = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter(c => [c.customerName, c.customerPhone, c.customerEmail, c.lastMessage.message, c.storeId ? storeNames[c.storeId] : null]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s)));
  }, [conversations, query, storeNames]);

  const active = filteredConvs.find(c => c.key === activeKey) ?? filteredConvs[0] ?? null;
  const unreadTotal = messages.filter(m => m.sender === "customer" && !m.seen).length;

  // Auto-scroll chat panel to bottom when active conversation changes / new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.key, active?.messages.length]);

  // Mark customer messages as seen when the owner opens the conversation
  useEffect(() => {
    if (!active) return;
    const unseenIds = active.messages.filter(m => m.sender === "customer" && !m.seen).map(m => m.id);
    if (unseenIds.length === 0) return;
    (async () => {
      const { error } = await supabase.from("store_messages").update({ seen: true }).in("id", unseenIds);
      if (!error) {
        setMessages(prev => prev.map(m => unseenIds.includes(m.id) ? { ...m, seen: true, seen_at: new Date().toISOString() } : m));
      }
    })();
  }, [active?.key, active?.messages.length]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim() || sending) return;
    if (!active.conversationId) return toast.error("Legacy message — customer must start a new chat to receive replies.");
    const targetStore = active.storeId ?? store?.id ?? null;
    if (!targetStore) return toast.error("No store selected");
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("store_messages").insert({
      store_id: targetStore,
      conversation_id: active.conversationId,
      sender: "owner",
      customer_name: active.customerName,
      customer_phone: active.customerPhone,
      customer_email: active.customerEmail,
      message: body,
      source: "dashboard",
      seen: false,
    });
    setSending(false);
    if (error) { setDraft(body); return toast.error(error.message); }
    load();
  };

  const deleteConversation = async () => {
    if (!active) return;
    if (!confirm("Delete this whole conversation?")) return;
    const ids = active.messages.map(m => m.id);
    const { error } = await supabase.from("store_messages").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("Conversation deleted");
    setMessages(prev => prev.filter(m => !ids.includes(m.id)));
    setActiveKey(null);
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  const lastOwnerSeenId = (() => {
    if (!active) return null;
    for (let i = active.messages.length - 1; i >= 0; i--) {
      if (active.messages[i].sender === "owner") return active.messages[i].seen ? active.messages[i].id : null;
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Live two-way chat with your storefront customers. {unreadTotal > 0 && <span className="font-semibold text-primary">{unreadTotal} unread</span>}</p>
      </div>

      <div className="grid h-[70vh] min-h-[560px] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations…" value={query} onChange={(e) => setQuery(e.target.value)} className="border-0 focus-visible:ring-0" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map((c) => (
              <button key={c.key} type="button" onClick={() => setActiveKey(c.key)}
                className={`block w-full border-b border-border p-3 text-left transition hover:bg-accent ${active?.key === c.key ? "bg-accent" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.customerName || c.customerPhone || c.customerEmail || "Customer"}</div>
                    {isAdmin && c.storeId && <div className="truncate text-[11px] text-muted-foreground">{storeNames[c.storeId] ?? "Store"}</div>}
                  </div>
                  {c.unread > 0 && <span className="grid min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {c.lastMessage.sender === "owner" ? "You: " : ""}{c.lastMessage.message}
                </p>
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(c.lastMessage.created_at).toLocaleString()}</div>
              </button>
            ))}
            {filteredConvs.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No conversations.</div>}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {!active ? (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <div><MessageCircle className="mx-auto h-10 w-10" /><p className="mt-2 text-sm">Select a conversation.</p></div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-bold">{active.customerName || "Customer"}</h2>
                    {isAdmin && active.storeId && <Badge variant="secondary" className="text-[10px]">{storeNames[active.storeId] ?? "Store"}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {active.customerPhone && <a href={`tel:${active.customerPhone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3 w-3" /> {active.customerPhone}</a>}
                    {active.customerEmail && <a href={`mailto:${active.customerEmail}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3 w-3" /> {active.customerEmail}</a>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={deleteConversation}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/20 px-4 py-4">
                {active.messages.map(m => {
                  const mine = m.sender === "owner";
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
                      <div className="max-w-[70%]">
                        <div className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm border border-border"}`}>
                          {m.message}
                        </div>
                        <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : "justify-start"}`}>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {mine && m.id === lastOwnerSeenId && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                              <CheckCheck className="h-3 w-3" /> Seen
                            </span>
                          )}
                          {mine && m.id !== lastOwnerSeenId && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-border p-3">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(e as any); } }}
                  rows={1}
                  placeholder={active.conversationId ? "Type your reply…" : "Legacy message — cannot reply."}
                  disabled={!active.conversationId}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                />
                <Button type="submit" size="icon" disabled={sending || !draft.trim() || !active.conversationId} className="h-10 w-10 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}