import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/use-cart";
import { T, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/store/$slug/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [lang, setLang] = useState<Lang>("en");
  const cart = useCart(slug);
  const t = T[lang];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [area, setArea] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(data);
    })();
  }, [slug]);

  if (!store) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;

  const primary = store.theme === "digital" ? "#6366F1" : "#059669";
  const insideCharge = Number(store.delivery_inside_dhaka ?? 60);
  const outsideCharge = Number(store.delivery_outside_dhaka ?? 100);
  const delivery = area === "inside" ? insideCharge : outsideCharge;
  const subtotal = cart.subtotal;
  const grandTotal = subtotal + delivery;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return toast.error(t.emptyCart);
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("Please fill all required fields");
    setSubmitting(true);
    // Distribute delivery charge across first line item; keep totals accurate.
    const rows = cart.items.map((it, idx) => ({
      store_id: store.id,
      product_id: it.id,
      product_title: it.title,
      quantity: it.qty,
      unit_price: Number(it.price),
      total: it.qty * Number(it.price) + (idx === 0 ? delivery : 0),
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_address: address.trim(),
      notes: notes.trim() || null,
      delivery_area: area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাহিরে",
      delivery_charge: idx === 0 ? delivery : 0,
    }));
    const { error } = await supabase.from("orders").insert(rows);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    cart.clear();
    navigate({ to: "/store/$slug/success", params: { slug } });
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-2">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto max-w-[160px] object-contain" />
              : <span className="text-xl font-extrabold" style={{ color: primary }}>{store.name}</span>}
          </Link>
          <div className="flex gap-1 rounded-full border p-1">
            {(["en", "bn"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${lang === l ? "text-white" : "text-slate-500"}`}
                style={lang === l ? { background: primary } : undefined}>
                {l === "en" ? "EN" : "বাং"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.checkout}</h1>
          <Link to="/store/$slug/cart" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t.yourCart}
          </Link>
        </div>

        <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_360px]">
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <Label>{t.name} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>{t.phone} *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>{t.address} *</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div>
              <Label className="mb-2 block">{t.selectArea} *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-3 transition ${area === "inside" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="area" checked={area === "inside"} onChange={() => setArea("inside")} className="h-4 w-4" />
                    <span className="font-semibold">{t.insideDhaka}</span>
                  </span>
                  <span className="text-sm font-bold">৳ {insideCharge}</span>
                </label>
                <label className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-3 transition ${area === "outside" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="area" checked={area === "outside"} onChange={() => setArea("outside")} className="h-4 w-4" />
                    <span className="font-semibold">{t.outsideDhaka}</span>
                  </span>
                  <span className="text-sm font-bold">৳ {outsideCharge}</span>
                </label>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-semibold">{t.cod}</div>
              <div className="text-slate-500">Pay in cash when you receive your order.</div>
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:sticky md:top-6">
            <h2 className="text-base font-bold">Order Summary</h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {cart.items.map((it) => (
                <div key={it.id} className="flex justify-between gap-2 text-sm">
                  <span className="line-clamp-1 flex-1 text-slate-700">{it.title} ×{it.qty}</span>
                  <span className="shrink-0 font-medium">৳ {(it.qty * Number(it.price)).toLocaleString()}</span>
                </div>
              ))}
              {cart.items.length === 0 && <div className="text-sm text-slate-400">{t.emptyCart}</div>}
            </div>
            <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>{t.subtotal}</span><span>৳ {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>{t.deliveryCharge}</span><span>৳ {delivery.toLocaleString()}</span></div>
              <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold"><span>{t.grandTotal}</span><span>৳ {grandTotal.toLocaleString()}</span></div>
            </div>
            <Button type="submit" disabled={submitting || cart.items.length === 0}
              className="mt-5 w-full" style={{ background: primary }}>
              {submitting ? "…" : t.placeOrder}
            </Button>
          </aside>
        </form>
      </main>
    </div>
  );
}
