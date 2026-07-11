import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Smartphone, Zap, MessageCircle, Globe, Check, ArrowRight, Sparkles, Store, CreditCard, BarChart3, Package } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold font-display">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-md" style={{ background: "var(--gradient-hero)" }}>
              <ShoppingBag className="h-4 w-4" />
            </span>
            DokanLab
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm" className="rounded-full shadow-sm">Start free</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(600px 300px at 85% 10%, oklch(0.85 0.12 200 / 0.35), transparent), radial-gradient(500px 260px at 10% 90%, oklch(0.85 0.14 160 / 0.35), transparent)",
          }}
        />
        <div className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> The Shopify of Bangladesh
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Launch your online store —{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                without the tech headache.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Beautiful storefront, product catalog, cart & checkout, WhatsApp orders, and simple admin — everything an F-commerce brand needs, in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="rounded-full px-7 shadow-lg">
                  Start your store — Free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/store/$slug" params={{ slug: "ghorerbazar" }}>
                <Button size="lg" variant="outline" className="rounded-full">View demo store</Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card", "Live in 5 minutes", "বাংলা + English"].map((x) => (
                <span key={x} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" /> {x}
                </span>
              ))}
            </div>
          </div>

          {/* Mock storefront preview */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] opacity-30 blur-3xl" style={{ background: "var(--gradient-hero)" }} />
            <div className="rounded-2xl border border-border bg-card p-3 shadow-2xl">
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-muted-foreground">yourstore.dokanlab.com</span>
              </div>
              <div className="rounded-xl bg-background p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-hero)" }} />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-8 rounded-full bg-secondary" />
                </div>
                <div className="mb-3 h-24 rounded-lg" style={{ background: "var(--gradient-hero)" }} />
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-2">
                      <div className="aspect-square rounded-md bg-secondary" />
                      <div className="mt-2 h-2 w-3/4 rounded bg-muted" />
                      <div className="mt-1 h-2 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-6 text-sm md:grid-cols-4">
          {[
            { k: "1000+", v: "Merchants" },
            { k: "৳2Cr+", v: "Orders processed" },
            { k: "5 min", v: "Setup time" },
            { k: "24/7", v: "Support" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <div className="font-display text-2xl font-bold text-primary">{s.k}</div>
              <div className="text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Everything you need. Nothing you don't.</h2>
          <p className="mt-3 text-muted-foreground">Built for Bangladeshi merchants — from your first order to your thousandth.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { icon: Store, title: "Beautiful storefront", desc: "Mobile-first design that turns visitors into customers." },
            { icon: Package, title: "Product & inventory", desc: "Add products with images, categories, and specs in minutes." },
            { icon: CreditCard, title: "Cart & checkout", desc: "Full cart, delivery charges, cash on delivery — all built in." },
            { icon: MessageCircle, title: "WhatsApp orders", desc: "Customers chat with you directly. Zero friction." },
            { icon: BarChart3, title: "Simple dashboard", desc: "See orders, revenue, and top products at a glance." },
            { icon: Globe, title: "বাংলা + English", desc: "One-click language toggle for your customers." },
          ].map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="grid h-12 w-12 place-items-center rounded-xl text-primary-foreground shadow-md" style={{ background: "var(--gradient-hero)" }}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-secondary/40 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Live in 3 steps</h2>
            <p className="mt-3 text-muted-foreground">No developer. No design skills. Just your products.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Create your store", d: "Sign up, pick a name, and your store URL is live." },
              { n: "02", t: "Add products", d: "Upload photos, prices, and descriptions. Organize into categories." },
              { n: "03", t: "Share & sell", d: "Send the link. Take orders via cart or WhatsApp." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-8 shadow-sm">
                <span className="font-display text-5xl font-bold text-primary/20">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-muted-foreground">Choose the plan that fits your needs. No hidden charges.</p>
        </div>

        <div className="mx-auto mb-16 grid max-w-5xl gap-6 md:grid-cols-2">
          {/* Self-serve plan */}
          <div className="relative flex flex-col rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:shadow-md">
            <div className="mb-6">
              <p className="text-sm font-medium text-muted-foreground">Self-Serve</p>
              <h3 className="mt-1 font-display text-2xl font-bold">Manage It Yourself</h3>
              <p className="mt-2 text-sm text-muted-foreground">You add products, manage orders, and set up your store on your own.</p>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">৳499</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm">
              {[
                "Unlimited products",
                "Order management dashboard",
                "COD, bKash, Nagad, Rocket support",
                "Custom delivery zones",
                "SEO, announcement bar, policy pages",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup" className="mt-auto">
              <Button variant="outline" className="w-full rounded-full">Get started</Button>
            </Link>
          </div>

          {/* Done-for-you plan */}
          <div className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-primary bg-card p-8 shadow-lg">
            <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Recommended
            </div>
            <div className="mb-6">
              <p className="text-sm font-medium text-primary">Done-For-You</p>
              <h3 className="mt-1 font-display text-2xl font-bold">We Do It All For You</h3>
              <p className="mt-2 text-sm text-muted-foreground">Store setup, product upload, and design — all handled by our team.</p>
            </div>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">৳999</span>
              <span className="text-muted-foreground">1st month</span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">Then <span className="font-semibold text-foreground">৳499/month</span> only</p>
            <ul className="mb-8 space-y-3 text-sm">
              {[
                "Everything in Self-Serve",
                "Full store setup by our team",
                "Product upload & categorization",
                "Logo & banner design help",
                "Delivery & payment configuration",
                "Priority support (WhatsApp)",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup" className="mt-auto">
              <Button className="w-full rounded-full">Start with Done-For-You</Button>
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-10 text-center text-white shadow-2xl md:p-16" style={{ background: "var(--gradient-hero)" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(600px 300px at 20% 20%, rgba(255,255,255,0.4), transparent), radial-gradient(500px 300px at 80% 80%, rgba(255,255,255,0.25), transparent)" }} />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold md:text-5xl">Start selling online today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">Free to start. No credit card required. Cancel anytime.</p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg" className="rounded-full bg-white px-8 font-semibold text-primary hover:bg-white/90">
                  Create your store <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DokanLab. Made for Bangladesh.
      </footer>
    </div>
  );
}
