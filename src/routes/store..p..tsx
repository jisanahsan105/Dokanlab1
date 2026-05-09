import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { T, type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft, Phone, Package } from "lucide-react";

export const Route = createFileRoute("/store/$slug/p/$productId")({ component: ProductPage });

function ProductPage() {
  const { slug, productId } = Route.useParams();
  const [store, setStore] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [salesCount, setSalesCount] = useState(0);
  const [lang, setLang] = useState<Lang>("en");
  const [qty, setQty] = useState(1);
  const [orderOpen, setOrderOpen] = useState(false);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(s);
      const { data: p } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      setProduct(p);
      if (s) {
        const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("store_id", s.id).eq("product_id", productId);
        setSalesCount(count ?? 0);
      }
    })();
  }, [slug, productId]);

  if (!store || !product) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;

  const isDigital = store.theme === "digital";
  const primary = isDigital ? "#6366F1" : "#059669";
  const phone = store.whatsapp || store.footer_phone;
  const original = (product as any).original_price ?? null;
  const hasOriginal = original && Number(original) > Number(product.price);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Top blue accent bar (per screenshot) */}
      <div className="h-1.5" style={{ background: "#2563EB" }} />

      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-2">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto max-w-[160px] object-contain" />
              : <span className="text-xl font-extrabold" style={{ color: primary }}>{store.name}</span>}
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/store/$slug" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80">
              <ArrowLeft className="h-4 w-4" /> {t.back}
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
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT: image card */}
          <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden">
              {product.image_url
                ? <img src={product.image_url} alt={product.title} className="mx-auto aspect-square w-full max-w-[420px] object-contain" />
                : <div className="grid aspect-square place-items-center bg-slate-100 text-slate-300"><Package className="h-16 w-16" /></div>}
            </div>
            {product.image_url && (
              <div className="mt-3 flex gap-2 border-t pt-3">
                <img src={product.image_url} alt="" className="h-12 w-12 cursor-pointer rounded border object-cover ring-1 ring-blue-400" />
              </div>
            )}
          </div>

          {/* RIGHT: details card */}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold leading-snug text-slate-900 md:text-[22px]">{product.title}</h1>

            <div className="mt-2 flex items-baseline gap-3 text-lg">
              {hasOriginal && (
                <span className="font-semibold text-slate-400 line-through">৳ {Number(original).toLocaleString()}</span>
              )}
              <span className="text-xl font-extrabold text-emerald-600">৳ {Number(product.price).toLocaleString()}</span>
            </div>

            <div className="mt-3 text-sm font-bold text-slate-800">
              Average Rating : 0 /5
            </div>

            {/* Quantity stepper - 3 small boxes [+][n][-] like screenshot */}
            <div className="mt-4 inline-flex items-center gap-0 overflow-hidden rounded border border-slate-300 text-sm">
              <button onClick={() => setQty(q => q + 1)} aria-label="Increase"
                className="grid h-8 w-8 place-items-center border-r border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100">+</button>
              <div className="grid h-8 w-10 place-items-center bg-white font-semibold">{qty}</div>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease"
                className="grid h-8 w-8 place-items-center border-l border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100">−</button>
            </div>

            {/* Order + Cart buttons (small, side by side) */}
            <div className="mt-4 flex flex-wrap gap-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOrderOpen(true)}
                className="rounded px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95"
                style={{ background: "#2563EB" }}>
                অর্ডার করুন
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOrderOpen(true)}
                className="rounded px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95"
                style={{ background: "#F59E0B" }}>
                কার্টে রাখুন
              </motion.button>
            </div>

            {/* Call to order — dark gray block, centered, two lines */}
            {phone && (
              <a href={`tel:${phone}`}
                className="mt-5 block rounded px-4 py-3 text-center text-white hover:opacity-95"
                style={{ background: "#4B5563" }}>
                <div className="text-sm">কল করতে ক্লিক করুন</div>
                <div className="mt-0.5 inline-flex items-center justify-center gap-1.5 text-sm font-semibold">
                  <Phone className="h-3.5 w-3.5" /> +{phone}
                </div>
              </a>
            )}

            {/* Sales count - light gray bg, red left border, red number */}
            <div className="mt-4 border-l-4 bg-slate-100 px-4 py-2.5 text-sm" style={{ borderColor: "#DC2626" }}>
              এখন পর্যন্ত এই পণ্যটি বিক্রয় হয়েছে মোট :{" "}
              <span className="font-bold" style={{ color: "#DC2626" }}>{salesCount}</span> পিস
            </div>

            {/* Delivery rows */}
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 text-sm">
              <div className="flex items-center justify-between px-1 py-2.5"><span className="text-slate-700">ঢাকার ভিতর ডেলিভারি চার্জ</span><span className="font-medium">৬০ টাকা</span></div>
              <div className="flex items-center justify-between px-1 py-2.5"><span className="text-slate-700">ঢাকার বাইরের ডেলিভারি চার্জ</span><span className="font-medium">১০০ টাকা</span></div>
            </div>
          </div>
        </div>

        {/* DESCRIPTION tab */}
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b">
            <div className="inline-block border-b-2 px-5 py-2.5 text-xs font-bold tracking-wider text-slate-700"
              style={{ borderColor: primary }}>
              DESCRIPTION
            </div>
          </div>
          <div className="space-y-2 px-5 py-5 text-sm leading-relaxed text-slate-700">
            {product.description
              ? product.description.split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => <p key={i}>{line}</p>)
              : <p className="text-slate-400">No description provided.</p>}
          </div>
        </div>

        {/* Ratings */}
        <div className="mt-5 rounded-md border border-slate-200 bg-white py-10 text-center shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Ratings &amp; Reviews From Our Customer</h3>
          <div className="mt-4 text-3xl font-extrabold">0 /5</div>
        </div>
      </main>

      {/* Order modal */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.checkout} <span className="text-xs font-normal text-slate-500">({t.cod})</span></DialogTitle></DialogHeader>
          <OrderForm store={store} product={product} qty={qty} setQty={setQty} t={t}
            onDone={() => setOrderOpen(false)} />
        </DialogContent>
      </Dialog>

      <WhatsAppFab phone={store.whatsapp} message={`Hi! I'm interested in ${product.title}`} />
    </div>
  );
}

function OrderForm({ store, product, qty, setQty, t, onDone }:
  { store: any; product: any; qty: number; setQty: (n: number) => void; t: any; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const total = Number(product.price) * qty;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      store_id: store.id, product_id: product.id, product_title: product.title,
      quantity: qty, unit_price: product.price, total,
      customer_name: name, customer_phone: phone, customer_address: address, notes,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t.thankYou);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t.qty}</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></div>
        <div><Label>{t.total}</Label><Input value={`৳${total.toFixed(2)}`} readOnly /></div>
      </div>
      <div><Label>{t.name}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>{t.phone}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
      <div><Label>{t.address}</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} required /></div>
      <div><Label>{t.notes}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "…" : t.placeOrder}
      </Button>
    </form>
  );
}
