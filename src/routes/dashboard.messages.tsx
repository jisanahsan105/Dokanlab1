import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCheck, Mail, MessageCircle, Phone, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/messages")({ component: MessagesPage });

type StoreMessage = {
  id: string;
  store_id: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  message: string;
  source: string;
  seen: boolean;
  seen_at: string | null;
  created_at: string;
};

function MessagesPage() {
  const { user } = useAuth();
  const { store } = useMyStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<StoreMessage[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return messages;
    return messages.filter((m) => [m.customer_name, m.customer_phone, m.customer_email, m.message, m.store_id ? storeNames[m.store_id] : null]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }, [messages, query, storeNames]);

  const active = filtered.find((m) => m.id === activeId) ?? filtered[0] ?? null;
  const unread = messages.filter((m) => !m.seen).length;

  useEffect(() => {
    if (!active || active.seen) return;
    const id = active.id;
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("store_messages").update({ seen: true }).eq("id", id);
      if (!error) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, seen: true, seen_at: new Date().toISOString() } : m)));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.seen]);

  const markAllSeen = async () => {
    const ids = messages.filter((m) => !m.seen).map((m) => m.id);
    if (!ids.length) return;
    const { error } = await supabase.from("store_messages").update({ seen: true }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("All messages marked as seen");
    setMessages((prev) => prev.map((m) => ({ ...m, seen: true, seen_at: m.seen_at ?? new Date().toISOString() })));
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("store_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message deleted");
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Customer messages from storefront chat.</p>
        </div>
        <Button variant="outline" onClick={markAllSeen} disabled={unread === 0}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all seen
        </Button>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages…" value={query} onChange={(e) => setQuery(e.target.value)} className="border-0 focus-visible:ring-0" />
          </div>
          <div className="max-h-[560px] overflow-auto">
            {filtered.map((m) => (
              <button key={m.id} type="button" onClick={() => setActiveId(m.id)}
                className={`block w-full border-b border-border p-4 text-left transition hover:bg-accent ${active?.id === m.id ? "bg-accent" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{m.customer_name || m.customer_phone || m.customer_email || "Customer"}</div>
                    {isAdmin && <div className="truncate text-xs text-muted-foreground">{m.store_id ? (storeNames[m.store_id] ?? "Store") : "System"}</div>}
                  </div>
                  {!m.seen && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">{m.message}</p>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No messages.</div>}
          </div>
        </aside>

        <section className="p-6">
          {!active ? (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <div><MessageCircle className="mx-auto h-10 w-10" /><p className="mt-2 text-sm">No message selected.</p></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{active.customer_name || "Customer message"}</h2>
                    {active.seen ? <Badge variant="secondary">Seen</Badge> : <Badge>New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{new Date(active.created_at).toLocaleString()}</p>
                  {isAdmin && active.store_id && <p className="text-sm text-muted-foreground">Store: {storeNames[active.store_id] ?? active.store_id}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => deleteMessage(active.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {active.customer_phone && <a href={`tel:${active.customer_phone}`} className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-accent"><Phone className="h-4 w-4 text-primary" /> {active.customer_phone}</a>}
                {active.customer_email && <a href={`mailto:${active.customer_email}`} className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-accent"><Mail className="h-4 w-4 text-primary" /> {active.customer_email}</a>}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-5 whitespace-pre-line leading-relaxed">
                <MessageBody text={active.message} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MessageBody({ text }: { text: string }) {
  // Auto-linkify URLs
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p)
          ? <a key={i} href={p} target="_blank" rel="noreferrer" className="text-primary underline break-all">{p}</a>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}