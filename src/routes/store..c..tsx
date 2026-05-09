import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { ArrowLeft, ShoppingBag, Package, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/store/c/")({ component: CategoryPage });

function CategoryPage() {
  const { slug, categoryId } = Route.useParams();
  const [store, setStore] = useState<any>(null);
  const [cat, setCat] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(s);
      const { data: c } = await supabase.from("categories").select("*").eq("id", categoryId).maybeSingle();
      setCat(c);
      if (s) {
        const { data: p } = await supabase.from("products").select("*")
          .eq("store_id", s.id).eq("active", true)
          .or(`category_id.eq.${categoryId},category.eq.${c?.name ?? "__none__"}`)
          .order("created_at", { ascending: false });
        setProducts(p ?? []);
      }
      setLoading(false);
    })();
  }, [slug, categoryId]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!store || !cat) return <div className="grid min-h-screen place-items-center text-muted-foreground">Category not found.</div>;

  const isDigital = store.theme === "digital";
  const primary = isDigital ? "#6366F1" : "#059669";
  const accent = isDigital ? "#22D3EE" : "#F59E0B";

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC", fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/store/$slug" params={{ slug }} className="flex items-center gap-2">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto max-w-[160px] object-contain" />
              : <span className="text-xl font-extrabold" style={{ color: primary }}>{store.name}</span>}
          </Link>
          <Link to="/store/$slug" params={{ slug }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: primary }}>
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      {/* Breadcrumb / banner */}
      <div className="text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${primary})` }}>
        <div className="container mx-auto px-4 py-8">
          <nav className="text-xs opacity-80">
            <Link to="/store/$slug" params={{ slug }} className="hover:underline">Home</Link>
            <ChevronRight className="mx-1 inline h-3 w-3" />
            <span>{cat.name}</span>
          </nav>
          <div className="mt-2 flex items-center gap-4">
            {cat.image_url && <img src={cat.image_url} alt={cat.name} className="h-16 w-16 rounded-xl object-cover ring-2 ring-white/30" />}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{cat.name}</h1>
              <p className="mt-1 text-sm opacity-90">{products.length} products</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center text-muted-foreground">No products in this category yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map(p => <CatProductCard key={p.id} p={p} slug={slug} primary={primary} accent={accent} />)}
          </div>
        )}
      </main>

      <WhatsAppFab phone={store.whatsapp} message={`Hi ${store.name}!`} />
    </div>
  );
}

function CatProductCard({ p, slug, primary, accent }: { p: any; slug: string; primary: string; accent: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
      <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
        className="group block overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg">
        <div className="overflow-hidden bg-slate-50">
          {p.image_url
            ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-110" />
            : <div className="grid aspect-square place-items-center text-slate-300"><Package className="h-10 w-10" /></div>}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight" style={{ color: primary }}>{p.title}</h3>
          <div className="mt-2 text-base font-extrabold text-slate-900">৳{Number(p.price).toLocaleString()}</div>
        </div>
        <div className="grid grid-cols-1">
          <Button size="sm" className="h-9 w-full rounded-none text-xs font-semibold text-white"
            style={{ background: "#1f2937" }}>
            🛒 অর্ডার করুন
          </Button>
          <Button size="sm" className="h-9 w-full rounded-none text-xs font-semibold text-white"
            style={{ background: accent }}>
            <ShoppingBag className="h-3 w-3" /> Add to Cart
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}
