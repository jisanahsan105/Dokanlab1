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
import { ArrowLeft, Phone, Star, Plus, Minus, ShoppingCart, Package } from "lucide-react";

export const Route = createFileRoute("/store/p/")({ component: ProductPage });

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

  if (!store || !product) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  const isDigital = store.theme === "digital";
  const primary = isDigital ? "#6366F1" : "#059669";
  const orderColor = "#2563EB"; // blue Order button (per screenshot)
  const cartColor = "#F59E0B"; // orange Cart button

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Top accent bar */}
      <div className="h-1.5" style={{ background: primary }} />

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

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT: image gallery */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {product.image_url
              ? <img src={product.image_url} alt={product.title} className="mx-auto aspect-square w-full max-w-md rounded-lg object-contain" />
              : <div className="grid aspect-square place-items-center rounded-lg bg-slate-100 text-slate-300"><Package className="h-16 w-16" /></div>}
            {/* Thumbnails (placeholder using same image) */}
            {product.image_url && (
              <div className="mt-3 flex gap-2 border-t pt-3">
                <img src={product.image_url} alt="" className="h-14 w-14 rounded-md border object-cover ring-2 ring-offset-1" style={{ borderColor: primary }} />
              </div>
            )}
          </div>

          {/* RIGHT: details */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold leading-tight text-slate-900 md:text-[26px]">{product.title}</h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-emerald-600">৳ {Number(product.price).toLocaleString()}</span>
            </div>

            <div className="mt-3 flex items-center gap-1 text-sm">
              <span className="font-semibold text-slate-700">Average Rating :</span>
              <span className="font-bold">0 /5</span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>

            {/* Quantity */}
            <div className="mt-5 inline-flex items-center overflow-hidden rounded-md border">
              <button onClick={() => setQty(q => q + 1)} aria-label="Increase"
                className="grid h-9 w-9 place-items-center bg-slate-100 hover:bg-slate-200">
                <Plus className="h-4 w-4" />
              </button>
              <div className="grid h-9 w-12 place-items-center font-semibold">{qty}</div>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease"
                className="grid h-9 w-9 place-items-center bg-slate-100 hover:bg-slate-200">
                <Minus className="h-4 w-4" />
              </button>
            </div>

            {/* Buttons row */}
            <div className="mt-5 flex flex-wrap gap-3">
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setOrderOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95"
                style={{ background: orderColor }}>
                অর্ডার করুন
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setOrderOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95"
                style={{ background: cartColor }}>
                <ShoppingCart className="h-4 w-4" /> কার্টে রাখুন
              </motion.button>
            </div>

            {/* Call to order */}
            {(store.whatsapp || store.footer_phone) && (
              <a href={`tel:${store.whatsapp || store.footer_phone}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white"
                style={{ background: "#475569" }}>
                <span>কল করতে ক্লিক করুন</span>
                <Phone className="h-4 w-4" />
                <span>+{store.whatsapp || store.footer_phone}</span>
              </a>
            )}

            {/* Sales count */}
            <div className="mt-4 rounded border-l-4 bg-slate-50 px-4 py-2 text-sm" style={{ borderColor: "#DC2626" }}>
              এখন পর্যন্ত এই পণ্যটি বিক্রয় হয়েছে মোট :{" "}
              <span className="font-bold" style={{ color: "#DC2626" }}>{salesCount}</span> পিস
            </div>

            {/* Delivery info */}
            <div className="mt-3 divide-y rounded border text-sm">
              <div className="flex justify-between px-4 py-2.5"><span>ঢাকার ভিতর ডেলিভারি চার্জ</span><span className="font-semibold">৬০ টাকা</span></div>
              <div className="flex justify-between px-4 py-2.5"><span>ঢাকার বাইরের ডেলিভারি চার্জ</span><span className="font-semibold">১০০ টাকা</span></div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: primary }}>DESCRIPTION</h2>
          </div>
          <div className="space-y-2 px-5 py-5 text-sm leading-relaxed text-slate-700">
            {product.description
              ? product.description.split("\n").map((line: string, i: number) => <p key={i}>{line}</p>)
              : <p className="text-muted-foreground">No description provided.</p>}
          </div>
        </div>

        {/* Ratings placeholder */}
        <div className="mt-6 rounded-xl border bg-white py-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Ratings & Reviews From Our Customer</h3>
          <div className="mt-4 text-4xl font-extrabold">0 /5</div>
        </div>
      </main>

      {/* Order modal */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.checkout} <span className="text-xs font-normal text-muted-foreground">({t.cod})</span></DialogTitle></DialogHeader>
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
