import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Package, ShoppingCart, DollarSign } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Overview() {
  const { store } = useMyStore();
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  useEffect(() => {
    if (!store) return;
    (async () => {
      const [{ count: products }, { data: orders }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("orders").select("total,status").eq("store_id", store.id),
      ]);
      const activeOrders = (orders ?? []).filter((o: any) => o.status !== "cancelled");
      setStats({
        products: products ?? 0,
        orders: activeOrders.length,
        revenue: activeOrders.reduce((s, o: any) => s + Number(o.total), 0),
      });
    })();
  }, [store]);

  if (!store) return null;
  const cards = [
    { label: "Products", value: stats.products, icon: Package, to: "/dashboard/products" as const },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, to: "/dashboard/orders" as const },
    { label: "Revenue (BDT)", value: `৳${stats.revenue.toFixed(0)}`, icon: DollarSign, to: "/dashboard/orders" as const },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {store.name}</h1>
        <p className="text-sm text-muted-foreground">Your store is live at /store/{store.slug}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-3xl font-bold">{c.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}