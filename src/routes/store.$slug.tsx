import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { T, type Lang } from "@/lib/i18n";
import { Download } from "lucide-react";

export const Route = createFileRoute("/store/$slug")({ component: Storefront });

function Storefront() {
  const { slug } = Route.useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [lang, setLang] = useState<Lang>("en");
  const [notFound, setNotFound] = useState(false);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setNotFound(true); return; }
      setStore(s);
      const { data: p } = await supabase.from("products").select("*").eq("store_id", s.id).eq("active", true).order("created_at", { ascending: false });
      setProducts(p ?? []);
    })();
  }, [slug]);

  if (notFound) return <div className="grid min-h-screen place-items-center text-muted-foreground">Store not found.</div>;
  if (!store) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  const isDigital = store.theme === "digital";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {store.logo_url ? <img src={store.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-lg text-lg font-bold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>{store.name[0]}</div>}
            <div>
              <h1 className="text-xl font-bold">{store.name}</h1>
              {store.bio && <p className="text-sm text-muted-foreground">{store.bio}</p>}
            </div>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["en", "bn"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-md px-3 py-1 text-sm font-medium ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l === "en" ? "EN" : "বাং"}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold">{t.products}</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">{t.noProducts}</div>
        ) : isDigital ? (
          <div className="space-y-3">
            {products.map((p) => (
              <Link key={p.id} to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-accent-foreground"><Download className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">৳{p.price}</div>
                  <div className="text-xs text-muted-foreground">{t.details}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="h-48 w-full object-cover transition group-hover:scale-105" /> : <div className="h-48 bg-muted" />}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{p.category}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">৳{p.price}</span>
                    <Button size="sm" variant="outline">{t.buyNow}</Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <WhatsAppFab phone={store.whatsapp} message={`Hi ${store.name}!`} />
    </div>
  );
}