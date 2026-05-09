import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Smartphone, Zap, MessageCircle, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </span>
            DokanLab
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost">Login</Button></Link>
            <Link to="/signup"><Button>Start Your Business</Button></Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-soft)" }}>
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" /> Built for F-commerce in Bangladesh
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Your own online store.
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                Live in 5 minutes.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Ditch the Facebook DM chaos. Get a beautiful storefront, product catalog, WhatsApp checkout, and order management — all in one place.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/signup"><Button size="lg" className="shadow-lg" style={{ background: "var(--gradient-hero)" }}>Start Your Business — Free</Button></Link>
              <Link to="/store/demo"><Button size="lg" variant="outline">View Demo Store</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Smartphone, title: "Mobile-first storefront", desc: "Looks gorgeous on every phone. Where your customers actually shop." },
            { icon: MessageCircle, title: "WhatsApp checkout", desc: "Customers chat directly with you. Cash on delivery built-in." },
            { icon: Globe, title: "বাংলা + English", desc: "Switch your storefront language with one click." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DokanLab. Made for Bangladesh.
      </footer>
    </div>
  );
}
