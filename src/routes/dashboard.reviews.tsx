import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/dashboard/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const { store } = useMyStore();
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from("reviews")
      .select("*, products(title)")
      .eq("store_id", store.id)
      .eq("approved", tab === "approved")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [store?.id, tab]);

  const approve = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ approved: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Approved");
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };
  const unapprove = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ approved: false }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["pending", "approved"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {k === "pending" ? "Pending" : "Approved"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No {tab} reviews yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.customer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.products?.title ?? "Product"} · {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 ${i <= Number(r.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {tab === "pending" ? (
                    <Button size="sm" onClick={() => approve(r.id)}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => unapprove(r.id)}>Unapprove</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {r.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}