import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/orders")({ component: OrdersPage });

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

type TabKey = "pending" | "active" | "delivered" | "cancelled";
const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "active", label: "Active", statuses: ["confirmed", "shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

function OrdersPage() {
  const { store } = useMyStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>("pending");

  const load = async () => {
    if (!store) return;
    const { data } = await supabase.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setOrders(data ?? []);
  };
  useEffect(() => { load(); }, [store]);

  useEffect(() => {
    if (!store) return;
    const ch = supabase.channel(`orders-${store.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${store.id}` }, (p) => {
      toast.success(`New order from ${(p.new as any).customer_name}!`);
      load();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [store]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  if (!store) return null;
  const counts: Record<TabKey, number> = {
    pending: 0, active: 0, delivered: 0, cancelled: 0,
  };
  for (const o of orders) {
    for (const t of TABS) if (t.statuses.includes(o.status)) counts[t.key]++;
  }
  const active = TABS.find((t) => t.key === tab)!;
  const filtered = orders.filter((o) => active.statuses.includes(o.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {t.label}
            <span
              className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-xs ${
                tab === t.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{o.product_title} <span className="text-muted-foreground">×{o.quantity}</span></h3>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <span className="text-lg font-bold text-primary">৳{o.total}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                <div><span className="text-muted-foreground">Name:</span> {o.customer_name}</div>
                <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${o.customer_phone}`} className="text-primary">{o.customer_phone}</a></div>
                <div><span className="text-muted-foreground">Address:</span> {o.customer_address}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} onClick={() => updateStatus(o.id, s)}>{s}</Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}