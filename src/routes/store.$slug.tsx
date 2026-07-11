import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { T, type Lang } from "@/lib/i18n";
import { useCart } from "@/lib/use-cart";
import { toast } from "sonner";
import {
  Search, ShoppingBag, ShoppingCart, Download, Sparkles, Flame, Star,
  ChevronRight, FileText, Package, Tag, ArrowRight,
  MapPin, Mail, Phone, Send, Facebook, Truck, ShieldCheck, RotateCcw, Headphones,
  Instagram, Youtube, Music2, Megaphone, Clock,
} from "lucide-react";

export const Route = createFileRoute("/store/$slug")({ component: Storefront });

type Product = {
  id: string; title: string; description: string | null; price: number;
  category: string | null; category_id: string | null; image_url: string | null; download_url: string | null;
  active: boolean; created_at: string;
};

type DbCategory = { id: string; name: string; image_url: string | null; active: boolean; position: number };

function Storefront() {
  const { slug } = Route.useParams();
  const location = useLocation();

  if (location.pathname !== `/store/${slug}` && location.pathname !== `/store/${slug}/`) {
    return <Outlet />;
  }

  return <StoreHome slug={slug} />;
}

function StoreHome({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (window.localStorage.getItem(`lang:${slug}`) as Lang) || "en";
  });
  const [activeCat, setActiveCat] = useState<string>("__all__");
  const [query, setQuery] = useState("");
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const cart = useCart(slug);
  const t = T[lang];

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(`lang:${slug}`, lang);
  }, [lang, slug]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setNotFound(true); return; }
      setStore(s);
      const { data: p } = await supabase.from("products").select("*")
        .eq("store_id", s.id).eq("active", true).order("created_at", { ascending: false });
      setProducts((p ?? []) as Product[]);
      const { data: c } = await supabase.from("categories").select("*")
        .eq("store_id", s.id).eq("active", true).order("position", { ascending: true });
      setDbCategories((c ?? []) as DbCategory[]);
      const { data: o } = await supabase.from("orders").select("product_id").eq("store_id", s.id);
      const counts: Record<string, number> = {};
      (o ?? []).forEach((row: any) => { if (row.product_id) counts[row.product_id] = (counts[row.product_id] ?? 0) + 1; });
      setOrderCounts(counts);
    })();
  }, [slug]);

  // Fonts loaded globally via __root (Space Grotesk + DM Sans)

  const isDigital = store?.theme === "digital";

  // Use managed categories if any exist; else fall back to product.category text
  const categories = useMemo(() => {
    if (dbCategories.length > 0) return dbCategories.map(c => c.name);
    const set = new Set<string>();
    products.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [dbCategories, products]);

  const catIdByName = useMemo(() => {
    const m: Record<string, string> = {};
    dbCategories.forEach(c => { m[c.name] = c.id; });
    return m;
  }, [dbCategories]);

  const goToCategory = (name: string) => {
    const id = catIdByName[name];
    if (id) navigate({ to: "/store/$slug/c/$categoryId", params: { slug, categoryId: id } });
    else { setActiveCat(name); document.getElementById(`cat-${slugify(name)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCat !== "__all__" && p.category !== activeCat) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (priceMax != null && Number(p.price) > priceMax) return false;
      return true;
    });
  }, [products, activeCat, query, priceMax]);

  const priceCeiling = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.max(...products.map(p => Number(p.price)));
  }, [products]);

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
        ["--sf-bg" as any]: "#FFFFFF",
        ["--sf-surface" as any]: "#FFFFFF",
        ["--sf-surface-2" as any]: "#F0FDF4",
        ["--sf-text" as any]: "#0F172A",
        ["--sf-muted" as any]: "#64748B",
        ["--sf-border" as any]: "rgba(15,23,42,0.08)",
        ["--sf-primary" as any]: "#10B981",
        ["--sf-primary-2" as any]: "#0EA5E9",
        ["--sf-accent" as any]: "#0EA5E9",
        ["--sf-hero" as any]: "linear-gradient(135deg, #10B981 0%, #06B6D4 55%, #0EA5E9 100%)",
      };

  // Owner-set brand primary color overrides theme default
  if (store.brand_primary_color) {
    (themeStyle as any)["--sf-primary"] = store.brand_primary_color;
    (themeStyle as any)["--sf-hero"] = `linear-gradient(135deg, ${store.brand_primary_color} 0%, ${(themeStyle as any)["--sf-primary-2"]} 100%)`;
  }

  // Update <title>, meta description, favicon from store settings
  useEffect(() => {
    if (typeof document === "undefined") return;
    const title = store.meta_title?.trim() || store.name;
    if (title) document.title = title;
    const desc = store.meta_description?.trim() || store.tagline || store.bio;
    if (desc) {
      let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
      m.content = desc;
    }
    if (store.favicon_url) {
      let l = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
      l.href = store.favicon_url;
    }
  }, [store.meta_title, store.meta_description, store.name, store.tagline, store.bio, store.favicon_url]);

  return (
    <div style={{ ...themeStyle, background: "var(--sf-bg)", color: "var(--sf-text)" }} className="min-h-screen font-sans">
      {/* Holiday banner */}
      {store.holiday_mode && (
        <div className="w-full px-4 py-2.5 text-center text-sm font-semibold text-white" style={{ background: "#DC2626" }}>
          🏖️ {store.holiday_message?.trim() || "We are currently closed. Orders are paused."}
        </div>
      )}
      {/* Announcement bar */}
      {store.announcement_enabled && store.announcement_text?.trim() && (
        <div className="w-full px-4 py-2 text-center text-xs font-medium text-white md:text-sm"
          style={{ background: "linear-gradient(90deg, var(--sf-primary), var(--sf-primary-2))" }}>
          <span className="inline-flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> {store.announcement_text}</span>
        </div>
      )}
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 shadow-sm" style={{ background: "var(--sf-surface)", borderBottom: "1px solid var(--sf-border)" }}>
        {/* Top bar: logo + search + actions */}
        <div className="container mx-auto flex items-center gap-3 px-4 py-3 md:gap-6 md:py-4">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-2 shrink-0">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto max-w-[160px] object-contain md:h-12" />
              : <>
                  <div className="grid h-10 w-10 place-items-center rounded-lg text-base font-bold text-white md:h-12 md:w-12" style={{ background: "var(--sf-hero)" }}>
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight md:text-2xl" style={{ color: "var(--sf-primary)" }}>{store.name}</span>
                </>}
          </Link>

          <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
            <Input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="h-11 rounded-md pr-28 text-sm"
              style={{ background: "#fff", color: "#0F172A", border: "2px solid var(--sf-primary)" }}
            />
            <button type="submit"
              className="absolute right-1 top-1 inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--sf-primary)" }}>
              <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          <div className="hidden md:flex gap-1 rounded-full p-1" style={{ background: "var(--sf-surface-2)" }}>
            {(["en", "bn"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition"
                style={lang === l ? { background: "var(--sf-primary)", color: "#fff" } : { color: "var(--sf-muted)" }}>
                {l === "en" ? "EN" : "বাং"}
              </button>
            ))}
          </div>

          <Link to="/store/$slug/cart" params={{ slug }}
            className="relative grid h-11 w-11 place-items-center rounded-full transition hover:scale-105"
            style={{ background: "var(--sf-surface-2)", color: "var(--sf-primary)" }} aria-label={t.cart}>
            <ShoppingCart className="h-5 w-5" />
            {cart.count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--sf-accent)" }}>{cart.count}</span>
            )}
          </Link>
        </div>

        {/* Colored categories strip */}
        {categories.length > 0 && (
          <div style={{ background: "var(--sf-primary)" }}>
            <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-2 scrollbar-none">
              <button onClick={() => setActiveCat("__all__")}
                className="shrink-0 px-4 py-2.5 text-sm font-semibold text-white/95 transition hover:bg-black/15"
                style={activeCat === "__all__" ? { background: "rgba(0,0,0,0.18)" } : undefined}>
                {t.all}
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => goToCategory(c)}
                  className="shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-white/95 transition hover:bg-black/15"
                  style={activeCat === c ? { background: "rgba(0,0,0,0.18)" } : undefined}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Custom Banner (if uploaded & enabled) */}
      {store.banner_enabled !== false && store.banner_url && (
        <section className="container mx-auto px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl shadow-lg"
            style={{ border: "1px solid var(--sf-border)", background: "var(--sf-surface-2)" }}>
            <img
              src={store.banner_url}
              alt={`${store.name} banner`}
              className="block w-full h-auto object-contain"
            />
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
                  style={{ transform: i % 2 === 0 ? "translateY(20px)" : "translateY(-10px)" }}>
                  <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }} preload="intent"
                    className="block overflow-hidden rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition duration-500 hover:scale-105" />
                      : <div className="grid aspect-square place-items-center text-white/60">{isDigital ? <Download /> : <Package />}</div>}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      <main className="container mx-auto px-4 py-10 space-y-14">
        {/* Trust badges */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Truck, title: t.fastDelivery, desc: t.fastDeliveryDesc },
            { icon: ShieldCheck, title: t.securePayment, desc: t.securePaymentDesc },
            { icon: RotateCcw, title: t.easyReturn, desc: t.easyReturnDesc },
            { icon: Headphones, title: t.support247, desc: t.support247Desc },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                style={{ background: "var(--sf-surface-2)", color: "var(--sf-primary)" }}>
                <b.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{b.title}</div>
                <div className="truncate text-xs" style={{ color: "var(--sf-muted)" }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Popular Categories grid (physical theme, BDStall-style) */}
        {!isDigital && categories.length > 0 && (
          <Section icon={<Tag className="h-5 w-5" />} title={t.categories}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {categories.map((c) => {
                const dbCat = dbCategories.find(d => d.name === c);
                const sample = productsByCategory[c]?.[0];
                const img = dbCat?.image_url || sample?.image_url || null;
                return (
                  <button key={c} onClick={() => goToCategory(c)}
                    className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:-translate-y-1"
                    style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)" }}>
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl"
                      style={{ background: "var(--sf-surface-2)" }}>
                      {img
                        ? <img src={img} alt={c} className="h-full w-full object-cover transition group-hover:scale-110" />
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
                <button onClick={() => goToCategory(cat)} className="flex items-center gap-1 text-sm font-semibold transition hover:gap-2"
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
                  {priceCeiling > 0 && (
                    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--sf-border)" }}>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--sf-muted)" }}>{t.filterByPrice}</h3>
                        {priceMax != null && (
                          <button onClick={() => setPriceMax(null)} className="text-xs font-semibold" style={{ color: "var(--sf-primary)" }}>{t.clearFilters}</button>
                        )}
                      </div>
                      <input type="range" min={0} max={priceCeiling} step={Math.max(1, Math.round(priceCeiling / 100))}
                        value={priceMax ?? priceCeiling}
                        onChange={(e) => setPriceMax(Number(e.target.value))}
                        className="w-full accent-emerald-600" />
                      <div className="mt-1 flex justify-between text-xs" style={{ color: "var(--sf-muted)" }}>
                        <span>৳ 0</span>
                        <span>৳ {(priceMax ?? priceCeiling).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </aside>
              )}
              <div>
                {isDigital ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtered.map(p => <DigitalCard key={p.id} p={p} slug={slug} t={t} />)}
                  </div>
                 ) : (
                   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                     {filtered.map(p => (
                       <ProductCard key={p.id} p={p} slug={slug} isDigital={false} t={t}
                         onAddToCart={() => { cart.add({ id: p.id, title: p.title, price: Number(p.price), image_url: p.image_url }); toast.success(t.addToCart + " ✓"); }} />
                     ))}
                   </div>
                 )}
              </div>
            </div>
          )}
        </section>
      </main>

      <StoreFooter store={store} isDigital={isDigital} />

      <WhatsAppFab storeId={store.id} storeName={store.name} message={`Hi ${store.name}!`} />
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

function ProductCard({ p, slug, isDigital, t, ribbon, compact, onAddToCart }: { p: Product; slug: string; isDigital: boolean; t: any; ribbon?: string; compact?: boolean; onAddToCart?: () => void }) {
  const inStock = p.active;
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <div
        className="group block overflow-hidden rounded-2xl transition"
        style={{ background: "var(--sf-surface)", border: "1px solid var(--sf-border)", boxShadow: "0 4px 20px -8px rgba(0,0,0,0.12)" }}>
        <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }} preload="intent" className="block">
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
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white"
                style={{ background: "var(--sf-primary)" }}>
                {isDigital ? <><Download className="h-3 w-3" /> {t.downloadNow}</> : <><ShoppingBag className="h-3 w-3" /> {t.buyNow}</>}
              </span>
            )}
          </div>
          {compact && (
            <span className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-white"
              style={{ background: "var(--sf-primary)" }}>
              <ShoppingBag className="h-3 w-3" /> {t.buyNow}
            </span>
          )}
        </div>
        </Link>
        {onAddToCart && !compact && !isDigital && (
          <div className="px-4 pb-4">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(); }}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--sf-accent)" }}>
              <ShoppingCart className="h-3.5 w-3.5" /> {t.addToCart}
            </button>
          </div>
        )}
      </div>
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
      <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }} preload="intent"
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

function StoreFooter({ store, isDigital }: { store: any; isDigital: boolean }) {
  // Modern clean footer — dark slate with mint/sky accents, matches Fresh Mint & Sky theme.
  const palette = {
    bg: "#0B1220",
    surface: "rgba(255,255,255,0.04)",
    text: "#F1F5F9",
    muted: "rgba(241,245,249,0.62)",
    accent: "var(--sf-primary)",
    divider: "rgba(255,255,255,0.08)",
  };

  const [openPage, setOpenPage] = useState<null | { title: string; body: string }>(null);

  type FooterLink = { label: string; href?: string; text?: string };
  const links: FooterLink[] = [
    { label: "About Us", href: store.footer_about_url },
    { label: "Facebook Page", href: store.footer_facebook_url },
    { label: "Terms & Condition", href: store.footer_terms_url, text: store.footer_terms_text },
    { label: "Warranty Policy", href: store.footer_warranty_url, text: store.footer_warranty_text },
    { label: "Return & Refund", href: store.footer_return_url, text: store.footer_return_text },
    { label: "Privacy Policy", href: store.footer_privacy_url, text: store.footer_privacy_text },
  ].filter(l => (l.text && l.text.trim()) || l.href);

  const socials: Array<{ href?: string; label: string; Icon: any }> = [
    { href: store.footer_facebook_url, label: "Facebook", Icon: Facebook },
    { href: store.instagram_url, label: "Instagram", Icon: Instagram },
    { href: store.youtube_url, label: "YouTube", Icon: Youtube },
    { href: store.tiktok_url, label: "TikTok", Icon: Music2 },
    { href: store.whatsapp_channel_url, label: "WhatsApp", Icon: Send },
  ].filter(s => s.href);

  return (
    <>
    <footer className="mt-16" style={{ background: palette.bg, color: palette.text }}>
      {/* Newsletter band */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: palette.divider }}>
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(600px 200px at 15% 50%, rgba(16,185,129,0.35), transparent), radial-gradient(600px 200px at 85% 50%, rgba(14,165,233,0.30), transparent)" }} />
        <div className="container relative mx-auto grid gap-6 px-4 py-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-xl font-bold tracking-tight md:text-2xl">Stay in the loop</h3>
            <p className="mt-1 text-sm" style={{ color: palette.muted }}>
              Get exclusive offers & new arrivals in your inbox.
            </p>
          </div>
          <form onSubmit={(e) => e.preventDefault()}
            className="flex w-full overflow-hidden rounded-full md:w-auto"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${palette.divider}` }}>
            <input type="email" placeholder="Your email address"
              className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm outline-none placeholder:text-white/40 md:w-80"
              style={{ color: palette.text }} />
            <button type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--sf-hero)" }}>
              <Send className="h-4 w-4" /> Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main columns */}
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        {/* Brand + contact */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto max-w-[160px] object-contain" />
              : <>
                  <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: "var(--sf-hero)" }}>
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight">{store.name}</div>
                </>}
          </div>
          {store.bio && (
            <p className="max-w-md text-sm leading-relaxed" style={{ color: palette.muted }}>{store.bio}</p>
          )}
          <ul className="space-y-2.5 text-sm">
            {store.footer_address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.accent }} />
                <span style={{ color: palette.muted }}>{store.footer_address}</span>
              </li>
            )}
            {store.footer_email && (
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0" style={{ color: palette.accent }} />
                <a href={`mailto:${store.footer_email}`} className="transition hover:text-white" style={{ color: palette.muted }}>{store.footer_email}</a>
              </li>
            )}
            {store.footer_phone && (
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0" style={{ color: palette.accent }} />
                <a href={`tel:${store.footer_phone}`} className="transition hover:text-white" style={{ color: palette.muted }}>{store.footer_phone}</a>
              </li>
            )}
            {(store.business_hours || store.business_days) && (
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.accent }} />
                <span style={{ color: palette.muted }}>
                  {store.business_hours}
                  {store.business_days && <span className="block text-xs opacity-80">{store.business_days}</span>}
                </span>
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-full transition hover:scale-110 hover:text-white"
                  style={{ background: palette.surface, color: palette.muted, border: `1px solid ${palette.divider}` }}>
                  <s.Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Information links */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: palette.text }}>Information</h3>
          <div className="mt-2 h-0.5 w-8 rounded-full" style={{ background: palette.accent }} />
          <ul className="mt-5 space-y-3 text-sm">
            {(links.length > 0 ? links : [{ label: "About Us", href: "#" } as FooterLink, { label: "Facebook Page", href: "#" } as FooterLink]).map(l => {
              const hasText = !!(l.text && l.text.trim());
              const cls = "inline-flex items-center gap-1.5 transition hover:text-white text-left";
              return (
                <li key={l.label}>
                  {hasText ? (
                    <button type="button" onClick={() => setOpenPage({ title: l.label, body: l.text! })}
                      className={cls} style={{ color: palette.muted }}>
                      <ChevronRight className="h-3 w-3 opacity-60" /> {l.label}
                    </button>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer"
                      className={cls} style={{ color: palette.muted }}>
                      <ChevronRight className="h-3 w-3 opacity-60" /> {l.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Apps / help */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: palette.text }}>Shop with us</h3>
          <div className="mt-2 h-0.5 w-8 rounded-full" style={{ background: palette.accent }} />
          <div className="mt-5 flex flex-col gap-2.5">
            {store.footer_playstore_url && (
              <a href={store.footer_playstore_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${palette.divider}` }}>
                <span className="text-base">▶</span>
                <span><span className="block text-[9px] font-normal opacity-70">ANDROID APP ON</span>Google Play</span>
              </a>
            )}
            {store.footer_appstore_url && (
              <a href={store.footer_appstore_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${palette.divider}` }}>
                <span className="text-base"></span>
                <span><span className="block text-[9px] font-normal opacity-70">Download on the</span>App Store</span>
              </a>
            )}
            {!store.footer_playstore_url && !store.footer_appstore_url && (
              <p className="text-sm" style={{ color: palette.muted }}>
                Fast delivery, cash on delivery, and 24/7 support across Bangladesh.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t" style={{ borderColor: palette.divider }}>
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs md:flex-row"
          style={{ color: palette.muted }}>
          <div>{store.footer_copyright?.trim() || `© ${new Date().getFullYear()} ${store.name}. All rights reserved.`}</div>
          <div className="flex items-center gap-1.5">
            Powered by
            <span className="font-semibold text-white">DokanLab</span>
          </div>
        </div>
      </div>
    </footer>
    <Dialog open={!!openPage} onOpenChange={(v) => !v && setOpenPage(null)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{openPage?.title}</DialogTitle>
        </DialogHeader>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {openPage?.body}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}