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
import { useCart } from "@/lib/use-cart";
import { toast } from "sonner";
import { ArrowLeft, Phone, Package, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/store/$slug/p/$productId")({ component: ProductPage });

function ProductPage() {
  const { slug, productId } = Route.useParams();
  const [store, setStore] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [salesCount, setSalesCount] = useState(0);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (window.localStorage.getItem(`lang:${slug}`) as Lang) || "en";
  });
  const [qty, setQty] = useState(1);
  const [orderOpen, setOrderOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reloadReviews, setReloadReviews] = useState(0);
  const [related, setRelated] = useState<any[]>([]);
  const cart = useCart(slug);
  const t = T[lang];

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(`lang:${slug}`, lang);
  }, [lang, slug]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(s);
      if (s) {
        const { data: p } = await supabase.from("products").select("*")
          .eq("store_id", s.id).eq("id", productId).eq("active", true).maybeSingle();
        setProduct(p);
        const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("store_id", s.id).eq("product_id", productId);
        setSalesCount(count ?? 0);
      } else {
        setProduct(null);
      }
    })();
  }, [slug, productId]);

  useEffect(() => {
    if (!product?.id) return;
    (async () => {
      const { data } = await supabase.from("reviews").select("*")
        .eq("product_id", product.id).eq("approved", true)
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
    })();
  }, [product?.id, reloadReviews]);

  useEffect(() => {
    if (!store || !product) return;
    (async () => {
      const q = supabase.from("products").select("*").eq("store_id", store.id).eq("active", true).neq("id", product.id).limit(8);
      const filter = product.category_id
        ? await q.eq("category_id", product.category_id)
        : product.category
          ? await q.eq("category", product.category)
          : await q.order("created_at", { ascending: false });
      setRelated((filter.data ?? []).slice(0, 8));
    })();
  }, [store, product]);

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
            <Link to="/store/$slug/cart" params={{ slug }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100"
              aria-label={t.cart}>
              <ShoppingCart className="h-4 w-4" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-[1rem] place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: primary }}>{cart.count}</span>
              )}
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
              Average Rating : {reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : "0"} /5
              <span className="ml-1 font-normal text-slate-500">({reviews.length})</span>
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
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                cart.add({ id: product.id, title: product.title, price: Number(product.price), image_url: product.image_url }, qty);
                toast.success(t.addToCart + " ✓");
              }}
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

            {store.product_whatsapp_url && (
              <a href={store.product_whatsapp_url} target="_blank" rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                style={{ background: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .2 5.3.2 11.83c0 2.08.55 4.11 1.6 5.9L0 24l6.4-1.68a11.83 11.83 0 0 0 5.65 1.44h.01c6.53 0 11.83-5.3 11.83-11.83 0-3.16-1.23-6.13-3.47-8.45zM12.06 21.6h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.22-3.8 1 1.02-3.7-.24-.38a9.79 9.79 0 0 1-1.5-5.1c0-5.42 4.42-9.83 9.85-9.83 2.63 0 5.1 1.03 6.96 2.88a9.77 9.77 0 0 1 2.88 6.95c0 5.43-4.42 9.85-9.8 9.85z"/></svg>
                WhatsApp এ অর্ডার করুন
              </a>
            )}

            {/* Sales count - light gray bg, red left border, red number */}
            <div className="mt-4 border-l-4 bg-slate-100 px-4 py-2.5 text-sm" style={{ borderColor: "#DC2626" }}>
              এখন পর্যন্ত এই পণ্যটি বিক্রয় হয়েছে মোট :{" "}
              <span className="font-bold" style={{ color: "#DC2626" }}>{salesCount}</span> পিস
            </div>

            {/* Delivery rows */}
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 text-sm">
              {(Array.isArray(store.delivery_zones) && store.delivery_zones.length > 0
                ? store.delivery_zones.map((z: any) => ({ name: String(z.name), charge: Number(z.charge ?? 0) }))
                : [
                    { name: "ঢাকার ভিতর ডেলিভারি চার্জ", charge: Number(store.delivery_inside_dhaka ?? 60) },
                    { name: "ঢাকার বাইরের ডেলিভারি চার্জ", charge: Number(store.delivery_outside_dhaka ?? 100) },
                  ]
              ).map((z: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-1 py-2.5">
                  <span className="text-slate-700">{z.name}</span>
                  <span className="font-medium">{z.charge} টাকা</span>
                </div>
              ))}
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

        <ReviewsSection
          storeId={store.id}
          productId={product.id}
          primary={primary}
          reviews={reviews}
          onSubmitted={() => setReloadReviews((n) => n + 1)}
        />

        {related.length > 0 && (
          <section className="mt-6">
            <div className="mb-4 flex items-end justify-between border-b pb-2" style={{ borderColor: "#e2e8f0" }}>
              <h2 className="text-lg font-bold text-slate-900">{t.relatedProducts}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {related.map((r) => (
                <Link key={r.id} to="/store/$slug/p/$productId" params={{ slug, productId: r.id }} preload="intent"
                  className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="overflow-hidden bg-white p-2">
                    {r.image_url
                      ? <img src={r.image_url} alt={r.title} className="aspect-square w-full object-contain transition duration-500 group-hover:scale-105" />
                      : <div className="grid aspect-square place-items-center text-slate-300"><Package className="h-10 w-10" /></div>}
                  </div>
                  <div className="px-3 pb-3">
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight" style={{ color: primary }}>{r.title}</h3>
                    <div className="mt-1 text-sm font-bold text-slate-900">৳ {Number(r.price).toLocaleString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Order modal */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <OrderForm store={store} product={product} qty={qty} setQty={setQty} t={t}
            onDone={() => setOrderOpen(false)} />
        </DialogContent>
      </Dialog>

      <WhatsAppFab storeId={store.id} storeName={store.name} message={`Hi! I'm interested in ${product.title}`} />
    </div>
  );
}

function OrderForm({ store, product, qty, setQty, t, onDone }:
  { store: any; product: any; qty: number; setQty: (n: number) => void; t: any; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<"inside" | "outside">("outside");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const insideCharge = Number(store.delivery_inside_dhaka ?? 60);
  const outsideCharge = Number(store.delivery_outside_dhaka ?? 100);
  const deliveryCharge = area === "inside" ? insideCharge : outsideCharge;
  const subtotal = Number(product.price) * qty;
  const total = subtotal + deliveryCharge;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return toast.error("Please accept Terms & Conditions");
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      store_id: store.id, product_id: product.id, product_title: product.title,
      quantity: qty, unit_price: product.price, total,
      customer_name: name, customer_phone: phone, customer_address: address,
      delivery_area: area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাহিরে",
      delivery_charge: deliveryCharge,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t.thankYou);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded border-2 border-dashed border-emerald-400 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800">
        অর্ডারটি কনফার্ম করতে আপনার নাম, ঠিকানা, মোবাইল নাম্বার, লিখে{" "}
        <span className="text-rose-600">অর্ডার কনফার্ম করুন</span> বাটনে ক্লিক করুন
      </div>

      <div>
        <Label className="text-sm font-semibold">আপনার নাম</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম লিখুন" required />
      </div>
      <div>
        <Label className="text-sm font-semibold">আপনার মোবাইল নম্বর</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="আপনার মোবাইল নম্বর লিখুন" required />
      </div>
      <div>
        <Label className="text-sm font-semibold">আপনার সম্পূর্ণ ঠিকানা</Label>
        <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="আপনার ঠিকানা সম্পূর্ণ লিখুন" required />
      </div>
      <div>
        <Label className="text-sm font-semibold text-sky-700">Select Area</Label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as "inside" | "outside")}
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="inside">ঢাকার ভিতরে (৳ {insideCharge})</option>
          <option value="outside">ঢাকার বাহিরে (৳ {outsideCharge})</option>
        </select>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <div className="flex justify-between"><span>সাবটোটাল</span><span>৳ {subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><span>৳ {deliveryCharge.toLocaleString()}</span></div>
        <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>মোট</span><span>৳ {total.toLocaleString()}</span></div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="h-4 w-4" />
        <span>I accepted <a href={store.footer_terms_url || "#"} target="_blank" rel="noreferrer" className="font-semibold text-amber-600">Terms &amp; Conditions</a></span>
      </label>

      <button type="submit" disabled={submitting}
        className="w-full rounded bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow hover:bg-slate-800 disabled:opacity-60">
        {submitting ? "…" : "অর্ডার কনফার্ম করুন"}
      </button>
    </form>
  );
}

function ReviewsSection({
  storeId, productId, primary, reviews, onSubmitted,
}: { storeId: string; productId: string; primary: string; reviews: any[]; onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      store_id: storeId, product_id: productId,
      customer_name: name.trim(), rating, comment: comment.trim() || null,
      approved: false,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks! Your review will appear after approval.");
    setName(""); setComment(""); setRating(5);
    onSubmitted();
  };

  const Star = ({ filled }: { filled: boolean }) => (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${filled ? "fill-amber-400" : "fill-slate-200"}`}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Ratings &amp; Reviews From Our Customer</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-3xl font-extrabold">{avg} /5</div>
          <div className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={i <= Math.round(Number(avg))} />)}</div>
          <div className="text-sm text-slate-500">({reviews.length} review{reviews.length === 1 ? "" : "s"})</div>
        </div>

        {reviews.length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{r.customer_name}</div>
                  <div className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={i <= Number(r.rating)} />)}</div>
                </div>
                {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                <div className="mt-1 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900">Write a review</h4>
        <div className="mt-3 grid gap-3">
          <div>
            <Label className="text-xs">Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Your rating</Label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} star`}>
                  <svg viewBox="0 0 24 24" className={`h-6 w-6 ${i <= rating ? "fill-amber-400" : "fill-slate-200"}`}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Your review</Label>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-fit rounded px-5 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
            style={{ background: primary }}>
            {submitting ? "Submitting…" : "Submit review"}
          </button>
          <p className="text-xs text-slate-400">Your review will appear after the store owner approves it.</p>
        </div>
      </form>
    </div>
  );
}
