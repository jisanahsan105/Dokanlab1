import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { ArrowLeft, ShoppingCart, Package, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/store/$slug/c/$categoryId")({ component: CategoryPage });

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

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  if (!store || !cat) return <div className="grid min-h-screen place-items-center text-slate-500">Category not found.</div>;

  const isDigital = store.theme === "digital";
  const primary = isDigital ? "#6366F1" : "#059669";

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
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

      <main className="container mx-auto px-4 py-6">
        <nav className="mb-3 text-xs text-slate-500">
          <Link to="/store/$slug" params={{ slug }} className="hover:underline">Home</Link>
          <ChevronRight className="mx-1 inline h-3 w-3" />
          <span className="text-slate-700">{cat.name}</span>
        </nav>

        <h1 className="mb-4 text-xl font-bold text-slate-900 md:text-2xl">{cat.name}</h1>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center text-slate-500">No products in this category yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {products.map(p => <CatProductCard key={p.id} p={p} slug={slug} primary={primary} />)}
          </div>
        )}
      </main>

      <WhatsAppFab phone={store.whatsapp} message={`Hi ${store.name}!`} />
    </div>
  );
}

function CatProductCard({ p, slug, primary }: { p: any; slug: string; primary: string }) {
  const original = (p as any).original_price ?? null;
  const hasOriginal = original && Number(original) > Number(p.price);
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300 }}
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }} className="block">
        <div className="overflow-hidden bg-white p-2">
          {p.image_url
            ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-contain transition duration-500 hover:scale-105" />
            : <div className="grid aspect-square place-items-center text-slate-300"><Package className="h-10 w-10" /></div>}
        </div>
        <div className="px-3 pb-2">
          <h3 className="line-clamp-1 text-sm font-medium leading-tight hover:underline" style={{ color: primary }}>{p.title}</h3>
          <div className="mt-2 flex items-baseline gap-2 text-sm">
            {hasOriginal && (
              <span className="text-slate-400 line-through">৳ {Number(original).toLocaleString()}</span>
            )}
            <span className="font-bold text-slate-900">৳ {Number(p.price).toLocaleString()}</span>
          </div>
        </div>
      </Link>
      {/* Action buttons stacked, full width, no gaps */}
      <div className="flex flex-col">
        <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
          className="flex h-9 items-center justify-center gap-1.5 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-900">
          <ShoppingCart className="h-3.5 w-3.5" /> অর্ডার করুন
        </Link>
        <Link to="/store/$slug/p/$productId" params={{ slug, productId: p.id }}
          className="flex h-9 items-center justify-center gap-1.5 text-xs font-semibold text-white hover:opacity-90"
          style={{ background: "#F59E0B" }}>
          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
        </Link>
      </div>
    </motion.div>
  );
}
