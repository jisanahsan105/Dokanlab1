import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/use-cart";
import { T, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, Package } from "lucide-react";

export const Route = createFileRoute("/store/cart")({ component: CartPage });

function CartPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [lang, setLang] = useState<Lang>("en");
  const cart = useCart(slug);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(data);
    })();
  }, [slug]);

  if (!store) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  const primary = store.theme === "digital" ? "#6366F1" : "#059669";

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

      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.yourCart} <span className="text-sm font-normal text-slate-500">({cart.count} {cart.count === 1 ? t.item : t.items})</span></h1>
          <Link to="/store/$slug" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t.continueShopping}
          </Link>
        </div>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-slate-500">{t.emptyCart}</p>
            <Link to="/store/$slug" params={{ slug }}>
              <Button className="mt-6" style={{ background: primary }}>{t.continueShopping}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {cart.items.map((it) => (
                <div key={it.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
                    {it.image_url
                      ? <img src={it.image_url} alt={it.title} className="h-full w-full object-cover" />
                      : <div className="grid h-full w-full place-items-center text-slate-300"><Package className="h-6 w-6" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to="/store/$slug/p/$productId" params={{ slug, productId: it.id }} className="line-clamp-2 text-sm font-semibold hover:underline">
                      {it.title}
                    </Link>
                    <div className="mt-1 text-sm text-slate-500">৳ {Number(it.price).toLocaleString()}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center overflow-hidden rounded border border-slate-300 text-sm">
                        <button onClick={() => cart.setQty(it.id, it.qty - 1)} aria-label="Decrease"
                          className="grid h-8 w-8 place-items-center border-r border-slate-300 hover:bg-slate-100"><Minus className="h-3.5 w-3.5" /></button>
                        <div className="grid h-8 w-10 place-items-center font-semibold">{it.qty}</div>
                        <button onClick={() => cart.setQty(it.id, it.qty + 1)} aria-label="Increase"
                          className="grid h-8 w-8 place-items-center border-l border-slate-300 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <button onClick={() => cart.remove(it.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
                        <Trash2 className="h-3.5 w-3.5" /> {t.remove}
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-bold">৳ {(it.qty * Number(it.price)).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:sticky md:top-6">
              <h2 className="text-base font-bold">{t.subtotal}</h2>
              <div className="mt-3 flex justify-between text-sm"><span>{t.subtotal}</span><span className="font-semibold">৳ {cart.subtotal.toLocaleString()}</span></div>
              <div className="mt-1 text-xs text-slate-500">{t.deliveryCharge} calculated at checkout.</div>
              <Button onClick={() => navigate({ to: "/store/$slug/checkout", params: { slug } })}
                className="mt-5 w-full" style={{ background: primary }}>
                {t.proceedCheckout}
              </Button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
