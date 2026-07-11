import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Package, ShoppingCart, Settings, LogOut, Store as StoreIcon, ExternalLink, Tag, Star, Users as UsersIcon, Clock, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardLayout });

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [store, setStore] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessStatus, setAccessStatus] = useState<"pending" | "approved" | "blocked">("pending");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const [{ data: s }, { data: roles }, { data: prof }] = await Promise.all([
        supabase.from("stores").select("*").eq("owner_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin"),
        supabase.from("profiles").select("access_status").eq("id", user.id).maybeSingle(),
      ]);
      setStore(s);
      setIsAdmin(!!roles && roles.length > 0);
      setAccessStatus(((prof as any)?.access_status ?? "pending") as any);
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  if (loading || checking) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!store) {
    if (!isAdmin && accessStatus !== "approved") {
      return <AccessGate status={accessStatus} onSignOut={() => { signOut(); navigate({ to: "/" }); }} />;
    }
    return <CreateStore onCreated={setStore} userId={user!.id} />;
  }

  const nav = [
    { to: "/dashboard", label: "Overview", icon: StoreIcon, exact: true },
    { to: "/dashboard/products", label: "Products", icon: Package },
    { to: "/dashboard/categories", label: "Categories", icon: Tag },
    { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
    { to: "/dashboard/reviews", label: "Reviews", icon: Star },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ to: "/dashboard/users", label: "Users", icon: UsersIcon }] : []),
  ] as { to: string; label: string; icon: any; exact?: boolean }[];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </span>
            DokanLab
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/store/$slug" params={{ slug: store.slug }} target="_blank">
              <Button variant="outline" size="sm"><ExternalLink className="mr-2 h-4 w-4" />View store</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav.map((n) => {
            const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to as any} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </aside>
        <main><Outlet /></main>
      </div>
    </div>
  );
}

function AccessGate({ status, onSignOut }: { status: "pending" | "approved" | "blocked"; onSignOut: () => void }) {
  const blocked = status === "blocked";
  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10">
          {blocked ? <Ban className="h-7 w-7 text-destructive" /> : <Clock className="h-7 w-7 text-primary" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {blocked ? "Access blocked" : "Waiting for approval"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {blocked
            ? "Your account has been blocked by the administrator. Please contact support if you think this is a mistake."
            : "Thanks for signing up! An administrator needs to approve your account before you can create a store. You'll get access as soon as it's reviewed."}
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function CreateStore({ userId, onCreated }: { userId: string; onCreated: (s: any) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    setLoading(true);
    const { data, error } = await supabase.from("stores").insert({
      owner_id: userId, name, slug: cleanSlug, bio, whatsapp,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Store created!");
    onCreated(data);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Create your store</h1>
        <p className="mt-1 text-sm text-muted-foreground">A few details to get you live.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label>Store name</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} required /></div>
          <div>
            <Label>Store URL</Label>
            <div className="flex items-center rounded-md border border-input bg-input px-3">
              <span className="text-sm text-muted-foreground">/store/</span>
              <Input className="border-0 bg-transparent" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>
          <div><Label>Short bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div><Label>WhatsApp number (with country code, e.g. 8801XXXXXXXXX)</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create store"}</Button>
        </form>
      </div>
    </div>
  );
}