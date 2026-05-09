import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { T, type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/store/$slug/p/$productId")({ component: ProductPage });

function ProductPage() {
  const { slug, productId } = Route.useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(s);
      const { data: p } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      setProduct(p);
    })();
  }, [slug, productId]);

  if (!store || !product) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

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
    navigate({ to: "/store/$slug", params: { slug } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="h-4 w-4" /> {t.back}</Link>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["en", "bn"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-md px-3 py-1 text-sm font-medium ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l === "en" ? "EN" : "বাং"}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-2">
        <div>
          {product.image_url ? <img src={product.image_url} alt={product.title} className="w-full rounded-2xl object-cover shadow-sm" /> : <div className="aspect-square rounded-2xl bg-muted" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          {product.category && <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>}
          <div className="mt-4 text-3xl font-bold text-primary">৳{product.price}</div>
          {product.description && <p className="mt-4 text-muted-foreground">{product.description}</p>}

          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">{t.checkout} <span className="text-xs font-normal text-muted-foreground">({t.cod})</span></h2>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t.qty}</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></div>
              <div><Label>{t.total}</Label><Input value={`৳${total.toFixed(2)}`} readOnly /></div>
            </div>
            <div><Label>{t.name}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>{t.phone}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            <div><Label>{t.address}</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} required /></div>
            <div><Label>{t.notes}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting} style={{ background: "var(--gradient-hero)" }}>
              {submitting ? "…" : t.placeOrder}
            </Button>
          </form>
        </div>
      </main>

      <WhatsAppFab phone={store.whatsapp} message={`Hi! I'm interested in ${product.title}`} />
    </div>
  );
}