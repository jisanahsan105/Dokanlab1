import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Package, ShoppingCart, Settings, LogOut, Store as StoreIcon, ExternalLink, Tag, Star, Users as UsersIcon, Ban, CreditCard, Wallet, MessageCircle, AlertCircle } from "lucide-react";
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
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  useEffect(() => {
    if (!user || checking || (!store && !isAdmin)) return;
    let active = true;
    const loadUnread = async () => {
      let count = 0;
      if (isAdmin) {
        const { count: c } = await supabase.from("store_messages").select("id", { count: "exact", head: true }).eq("seen", false);
        count = c ?? 0;
      } else {
        const orParts: string[] = [`user_id.eq.${user.id}`];
        if (store) orParts.push(`store_id.eq.${store.id}`);
        const { count: c } = await supabase.from("store_messages").select("id", { count: "exact", head: true }).eq("seen", false).or(orParts.join(","));
        count = c ?? 0;
      }
      if (active) setUnreadMessages(count ?? 0);
    };
    loadUnread();
    const ch = supabase.channel(`store-messages-nav-${store?.id ?? "admin"}-${isAdmin ? "admin" : "owner"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_messages" }, loadUnread)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user, checking, store, isAdmin]);

  // Auto-reload when access_status flips (e.g. admin approves the user)
  useEffect(() => {
    if (!user || isAdmin) return;
    const ch = supabase.channel(`profile-access-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          const newStatus = payload?.new?.access_status;
          if (newStatus && newStatus !== accessStatus) {
            window.location.reload();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, isAdmin, accessStatus]);

  // Pending users: force them into the Billing page so they can submit payment.
  const isPending = !isAdmin && accessStatus === "pending";
  useEffect(() => {
    if (checking) return;
    if (isPending && !loc.pathname.startsWith("/dashboard/billing") && !loc.pathname.startsWith("/dashboard/messages")) {
      navigate({ to: "/dashboard/billing", replace: true } as any);
    }
  }, [checking, isPending, loc.pathname, navigate]);

  if (loading || checking) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin && accessStatus === "blocked") {
    return <BlockedGate onSignOut={() => { signOut(); navigate({ to: "/" }); }} />;
  }

  const nav = [
    ...(isPending ? [
      { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ] : store ? [
      { to: "/dashboard", label: "Overview", icon: StoreIcon, exact: true },
      { to: "/dashboard/products", label: "Products", icon: Package },
      { to: "/dashboard/categories", label: "Categories", icon: Tag },
      { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
      { to: "/dashboard/reviews", label: "Reviews", icon: Star },
      { to: "/dashboard/settings", label: "Settings", icon: Settings },
      { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ] : (!isAdmin ? [
      { to: "/dashboard", label: "Overview", icon: StoreIcon, exact: true },
      { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ] : [])),
    { to: "/dashboard/messages", label: "Messages", icon: MessageCircle, badge: unreadMessages },
    ...(isAdmin ? [
      { to: "/dashboard/users", label: "Users", icon: UsersIcon },
      { to: "/dashboard/payments", label: "Payments", icon: Wallet },
    ] : []),
  ] as { to: string; label: string; icon: any; exact?: boolean; badge?: number }[];

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
            {store && (
              <Link to="/store/$slug" params={{ slug: store.slug }} target="_blank">
                <Button variant="outline" size="sm"><ExternalLink className="mr-2 h-4 w-4" />View store</Button>
              </Link>
            )}
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
                <n.icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {!!n.badge && (
                  <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${active ? "bg-primary-foreground/20" : "bg-destructive text-destructive-foreground"}`}>
                    {n.badge > 99 ? "99+" : n.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </aside>
        <main>
          {isPending && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Complete your payment to activate your account</p>
                <p className="mt-1 text-amber-800">Choose a plan below, send the payment, then submit the transaction ID and screenshot. Admin will approve and unlock your dashboard.</p>
              </div>
            </div>
          )}
          {!isPending && !store && !isAdmin && loc.pathname === "/dashboard"
            ? <CreateStore onCreated={setStore} userId={user!.id} />
            : <Outlet />}
        </main>
      </div>
    </div>
  );
}

function BlockedGate({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10">
          <Ban className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Access blocked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account has been blocked by the administrator. Please contact support if you think this is a mistake.</p>
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