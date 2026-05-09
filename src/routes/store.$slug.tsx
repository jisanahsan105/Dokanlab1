import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { T, type Lang } from "@/lib/i18n";
import {
  Search, ShoppingBag, ShoppingCart, Download, Sparkles, Flame, Star,
  ChevronRight, FileText, Package, Tag, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/store/$slug")({ component: Storefront });

type Product = {
  id: string; title: string; description: string | null; price: number;
  category: string | null; image_url: string | null; download_url: string | null;
  active: boolean; created_at: string;
};

function Storefront() {
  const { slug } = Route.useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [lang, setLang] = useState<Lang>("en");
  const [activeCat, setActiveCat] = useState<string>("__all__");
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setNotFound(true); return; }
      setStore(s);
      const { data: p } = await supabase.from("products").select("*")
        .eq("store_id", s.id).eq("active", true).order("created_at", { ascending: false });
      setProducts((p ?? []) as Product[]);
      const { data: o } = await supabase.from("orders").select("product_id").eq("store_id", s.id);
      const counts: Record<string, number> = {};
      (o ?? []).forEach((row: any) => { if (row.product_id) counts[row.product_id] = (counts[row.product_id] ?? 0) + 1; });
      setOrderCounts(counts);
    })();
  }, [slug]);

  // Inject Inter font (storefront-only)
  useEffect(() => {
    const id = "storefront-inter";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);

  const isDigital = store?.theme === "digital";

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCat !== "__all__" && p.category !== activeCat) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCat, query]);

  const topSelling = useMemo(() => {
    return [...products]
      .map(p => ({ p, c: orderCounts[p.id] ?? 0 }))
      .sort((a, b) => b.c - a.c)
      .filter(x => x.c > 0)
      .slice(0, 8)
      .map(x => x.p);
  }, [products, orderCounts]);

  const bestProducts = useMemo(() => {
    // Heuristic: products with above-average price act as "best/featured" picks
    if (products.length === 0) return [];
    const avg = products.reduce((s, p) => s + Number(p.price), 0) / products.length;
    return products.filter(p => Number(p.price) >= avg).slice(0, 8);
  }, [products]);

  const newArrivals = products.slice(0, 8);

  // Group products by category for BDStall-style category sections (physical theme)
  const productsByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach(p => {
      const c = p.category?.trim() || "Other";
      (groups[c] ||= []).push(p);
    });
    return groups;
  }, [products]);

  if (notFound) return <div className="grid min-h-screen place-items-center text-muted-foreground">Store not found.</div>;
  if (!store) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  // Theme palette via scoped CSS vars
  const themeStyle: React.CSSProperties = isDigital
    ? {
        ["--sf-bg" as any]: "#0B1020",
        ["--sf-surface" as any]: "#111835",
        ["--sf-surface-2" as any]: "#1a2348",
        ["--sf-text" as any]: "#EEF2FF",
        ["--sf-muted" as any]: "#94A3B8",
        ["--sf-border" as any]: "rgba(148,163,184,0.18)",
        ["--sf-primary" as any]: "#6366F1",
        ["--sf-primary-2" as any]: "#8B5CF6",
        ["--sf-accent" as any]: "#22D3EE",
        ["--sf-hero" as any]: "linear-gradient(135deg, #0B1020 0%, #1E1B4B 50%, #312E81 100%)",
      }
    : {
        ["--sf-bg" as any]: "#F8FAFC",
        ["--sf-surface" as any]: "#FFFFFF",
        ["--sf-surface-2" as any]: "#F1F5F9",
        ["--sf-text" as any]: "#0F172A",
        ["--sf-muted" as any]: "#64748B",
        ["--sf-border" as any]: "rgba(15,23,42,0.08)",
        ["--sf-primary" as any]: "#059669",
        ["--sf-primary-2" as any]: "#10B981",
        ["--sf-accent" as any]: "#F59E0B",
        ["--sf-hero" as any]: "linear-gradient(135deg, #064E3B 0%, #059669 60%, #10B981 100%)",
      };

  return (
    <div style={{ ...themeStyle, background: "var(--sf-bg)", color: "var(--sf-text)", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }} className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "color-mix(in oklab, var(--sf-bg) 80%, transparent)", borderBottom: "1px solid var(--sf-border)" }}>
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-3 shrink-0">
            {store.logo_url
              ? <img src={store.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-2" style={{ ['--tw-ring-color' as any]: "var(--sf-primary)" }} />
              : <div className="grid h-10 w-10 place-items-center rounded-xl text-base font-bold text-white" style={{ background: "var(--sf-hero)" }}>{store.name[0]}</div>}
            <div className="hidden sm:block">
              <div className="text-base font-bold leading-tight">{store.name}</div>
              {store.bio && <div className="text-xs" style={{ color: "var(--sf-muted)" }}>{store.bio}</div>}
            </div>
          </Link>

          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--sf-muted)" }} />
            <Input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="pl-9 h-10 rounded-full border-0"
              style={{ background: "var(--sf-surface-2)", color: "var(--sf-text)" }}
            />
          </div>

          <div className="hidden md:flex gap-1 rounded-full p-1" style={{ background: "var(--sf-surface-2)" }}>
            {(["en", "bn"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition"
                style={lang === l ? { background: "var(--sf-primary)", color: "#fff" } : { color: "var(--sf-muted)" }}>
                {l === "en" ? "EN" : "বাং"}
              </button>
            ))}
          </div>

          <button className="relative grid h-10 w-10 place-items-center rounded-full transition hover:scale-105" style={{ background: "var(--sf-surface-2)" }} aria-label={t.cart}>
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: "var(--sf-accent)" }}>0</span>
          </button>
        </div>

        {/* Categories nav */}
        {categories.length > 0 && (
          <div className="container mx-auto flex items-center gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
            <button onClick={() => setActiveCat("__all__")}
              className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition"
              style={activeCat === "__all__"
                ? { background: "var(--sf-text)", color: "var(--sf-bg)" }
                : { background: "var(--sf-surface-2)", color: "var(--sf-muted)" }}>
              {t.all}
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition"
                style={activeCat === c
                  ? { background: "var(--sf-text)", color: "var(--sf-bg)" }
                  : { background: "var(--sf-surface-2)", color: "var(--sf-muted)" }}>
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Custom Banner (if uploaded & enabled) */}
      {store.banner_enabled !== false && store.banner_url && (
        <section className="container mx-auto px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl shadow-lg" style={{ border: "1px solid var(--sf-border)" }}>
            <img src={store.banner_url} alt={`${store.name} banner`} className="w-full max-h-[420px] object-cover" />
          </motion.div>
        </section>
      )}

      {/* Hero (only if no custom banner or for digital theme) */}
      {(!store.banner_url || store.banner_enabled === false || isDigital) && (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--sf-hero)" }} />
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(1000px 400px at 80% 20%, rgba(255,255,255,0.25), transparent), radial-gradient(800px 300px at 10% 80%, rgba(255,255,255,0.15), transparent)" }} />
        <div className="container relative mx-auto grid gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-white">
            <Badge className="mb-4 border-white/30 bg-white/10 text-white backdrop-blur" variant="outline">
              <Sparkles className="mr-1 h-3 w-3" /> {isDigital ? t.heroDigital : t.featured}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-md text-base text-white/80 md:text-lg">
              {isDigital ? t.heroDigital : t.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="rounded-full px-7 font-semibold shadow-xl"
                style={{ background: "#fff", color: "var(--sf-primary)" }}>
                <a href="#all-products">
                  {isDigital ? t.getAccess : t.shopNow} <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              {store.whatsapp && (
                <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  {t.chatWa}
                </Button>
              )}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative hidden md:block">
            <div className="absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {newArrivals.slice(0, 4).map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                  className="overflow-hidden rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20"
                  style={{ transform: i % 2 === 0 ? "translateY(20px)" : "translateY(-10px)" }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover" />
                    : <div className="grid aspect-square place-items-center text-white/60">{isDigital ? <Download /> : <Package />}</div>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      <main className="container mx-auto px-4 py-10 space-y-14">
        {/* Popular Categories grid (physical theme, BDStall-style) */}
        {!isDigital && categories.length > 0 && (
          <Section icon={<Tag className="h-5 w-5" />} title={t.categories}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {categories.map((c) => {
                const sample = productsByCategory[c]?.[0];
                return (
                  <button key={c} onClick={() => { setActiveCat(c); document.getElementById(`cat-${slugify(c)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                    className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:-translate-y-1"
                    style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl"
                      style={{ background: "var(--sf-surface-2)" }}>
                      {sample?.image_url
                        ? <img src={sample.image_url} alt={c} className="h-full w-full object-cover transition group-hover:scale-110" />
                        : <Package className="h-7 w-7" style={{ color: "var(--sf-muted)" }} />}
                    </div>
                    <span className="text-center text-xs font-semibold leading-tight" style={{ color: "var(--sf-primary)" }}>{c}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {topSelling.length > 0 && (
          <Section icon={<Flame className="h-5 w-5" />} title={t.topSelling}>
            <Carousel>
              {topSelling.map(p => <ProductCard key={p.id} p={p} slug={slug} isDigital={isDigital} t={t} ribbon={t.topSelling} />)}
            </Carousel>
          </Section>
        )}

        {/* Per-category product sections (BDStall-style) - physical only */}
        {!isDigital && Object.entries(productsByCategory).map(([cat, items]) => (
          <section key={cat} id={`cat-${slugify(cat)}`} className="rounded-2xl p-5 md:p-6"
            style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
            <div className="mb-5 flex items-end justify-between border-b pb-3" style={{ borderColor: "var(--sf-border)" }}>
              <div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{cat}</h2>
                <div className="mt-1 h-0.5 w-12 rounded-full" style={{ background: "var(--sf-accent)" }} />
              </div>
              {items.length > 6 && (
                <button onClick={() => setActiveCat(cat)} className="flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
                  style={{ color: "var(--sf-accent)" }}>
                  View more <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.slice(0, 6).map(p => <ProductCard key={p.id} p={p} slug={slug} isDigital={false} t={t} compact />)}
            </div>
          </section>
        ))}

        {isDigital && bestProducts.length > 0 && (
          <Section icon={<Star className="h-5 w-5" />} title={t.bestProducts}>
            <Carousel>
              {bestProducts.map(p => <ProductCard key={p.id} p={p} slug={slug} isDigital={isDigital} t={t} ribbon={t.bestProducts} />)}
            </Carousel>
          </Section>
        )}

        {newArrivals.length > 0 && (isDigital || categories.length === 0) && (
          <Section icon={<Sparkles className="h-5 w-5" />} title={t.newArrivals}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {newArrivals.slice(0, 4).map(p => <ProductCard key={p.id} p={p} slug={slug} isDigital={isDigital} t={t} ribbon={t.featured} />)}
            </div>
          </Section>
        )}

        {/* All products with optional sidebar (physical) */}
        <section id="all-products">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">{t.allProducts}</h2>
            <span className="text-sm" style={{ color: "var(--sf-muted)" }}>{filtered.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: "var(--sf-border)", color: "var(--sf-muted)" }}>{t.noProducts}</div>
          ) : (
            <div className={`grid gap-6 ${!isDigital && categories.length > 0 ? "lg:grid-cols-[220px_1fr]" : ""}`}>
              {!isDigital && categories.length > 0 && (
                <aside className="rounded-2xl p-4 h-fit lg:sticky lg:top-32" style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--sf-muted)" }}>
                    <Tag className="h-4 w-4" /> {t.categories}
                  </h3>
                  <div className="space-y-1">
                    <CatBtn active={activeCat === "__all__"} onClick={() => setActiveCat("__all__")} label={t.all} />
                    {categories.map(c => (
                      <CatBtn key={c} active={activeCat === c} onClick={() => setActiveCat(c)} label={c} />
                    ))}
                  </div>
                </aside>
              )}
              <div>
                {isDigital ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtered.map(p => <DigitalCard key={p.id} p={p} slug={slug} t={t} />)}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(p => <ProductCard key={p.id} p={p} slug={slug} isDigital={false} t={t} />)}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t py-8 text-center text-sm" style={{ borderColor: "var(--sf-border)", color: "var(--sf-muted)" }}>
        © {new Date().getFullYear()} {store.name}
      </footer>

      <WhatsAppFab phone={store.whatsapp} message={`Hi ${store.name}!`} />
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--sf-surface-2)", color: "var(--sf-primary)" }}>{icon}</span>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-none">
      <div className="flex gap-4 snap-x snap-mandatory">
        {Array.isArray(children) && (children as any[]).map((c, i) => (
          <div key={i} className="snap-start shrink-0 w-[260px] sm:w-[280px]">{c}</div>
        ))}
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductCard({ p, slug, isDigital, t, ribbon, compact }: { p: Product; slug: string; isDigital: boolean; t: any; ribbon?: string; compact?: boolean }) {
  const inStock = p.active;
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
        className="group block overflow-hidden rounded-2xl transition"
        style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)", boxShadow: "0 4px 20px -8px rgba(0,0,0,0.12)" }}>
        <div className="relative overflow-hidden">
          {p.image_url
            ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-110" />
            : <div className="grid aspect-square place-items-center" style={{ background: "var(--sf-surface-2)", color: "var(--sf-muted)" }}>
                {isDigital ? <Download className="h-10 w-10" /> : <Package className="h-10 w-10" />}
              </div>}
          {ribbon && (
            <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg"
              style={{ background: "var(--sf-primary)" }}>{ribbon}</span>
          )}
          {!isDigital && (
            <span className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold backdrop-blur"
              style={{ background: inStock ? "rgba(16,185,129,0.95)" : "rgba(239,68,68,0.95)", color: "#fff" }}>
              {inStock ? t.inStock : t.outOfStock}
            </span>
          )}
        </div>
        <div className={compact ? "p-2.5" : "p-4"}>
          {!compact && p.category && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sf-muted)" }}>{p.category}</div>}
          <h3 className={`font-semibold leading-tight ${compact ? "text-sm line-clamp-2 min-h-[2.5rem]" : "line-clamp-1"}`}>{p.title}</h3>
          <div className={`flex items-center justify-between ${compact ? "mt-2" : "mt-3"}`}>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-extrabold ${compact ? "text-base" : "text-lg"}`} style={{ color: "var(--sf-primary)" }}>৳{p.price}</span>
            </div>
            {!compact && (
              <Button size="sm" className="h-8 rounded-full px-3 text-xs font-semibold text-white"
                style={{ background: "var(--sf-primary)" }}>
                {isDigital ? <><Download className="h-3 w-3" /> {t.downloadNow}</> : <><ShoppingBag className="h-3 w-3" /> {t.buyNow}</>}
              </Button>
            )}
          </div>
          {compact && (
            <Button size="sm" className="mt-2 h-7 w-full rounded-md px-2 text-[11px] font-semibold text-white"
              style={{ background: "var(--sf-primary)" }}>
              <ShoppingBag className="h-3 w-3" /> {t.buyNow}
            </Button>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function fileTypeOf(p: Product): string {
  const url = p.download_url || p.image_url || "";
  const m = url.toLowerCase().match(/\.([a-z0-9]{2,5})(\?|$)/);
  if (m) return m[1].toUpperCase();
  const cat = (p.category || "").toLowerCase();
  if (cat.includes("ebook") || cat.includes("book")) return "PDF";
  if (cat.includes("software") || cat.includes("app")) return "Software";
  if (cat.includes("template")) return "ZIP";
  return "Digital";
}

function DigitalCard({ p, slug, t }: { p: Product; slug: string; t: any }) {
  const ft = fileTypeOf(p);
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300 }}>
      <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
        className="flex items-center gap-4 rounded-2xl p-4 transition group"
        style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, var(--sf-primary), var(--sf-primary-2))" }}>
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{p.title}</h3>
            <Badge variant="outline" className="shrink-0 text-[10px] font-bold" style={{ borderColor: "var(--sf-border)", color: "var(--sf-muted)" }}>{ft}</Badge>
          </div>
          {p.category && <div className="mt-0.5 truncate text-xs" style={{ color: "var(--sf-muted)" }}>{p.category}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-extrabold" style={{ color: "var(--sf-primary)" }}>৳{p.price}</div>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition" style={{ color: "var(--sf-primary)" }}>
            {t.getAccess} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition"
      style={active
        ? { background: "var(--sf-primary)", color: "#fff" }
        : { color: "var(--sf-text)" }}>
      {label}
    </button>
  );
}