import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserAsAdmin } from "@/lib/admin-users.functions";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, UserCheck, Ban, Clock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/users")({ component: UsersPage });

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  access_status: "pending" | "approved" | "blocked";
  created_at: string;
};

function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const deleteUserFn = useServerFn(deleteUserAsAdmin);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin");
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }
      await refresh();
    })();
  }, [user, authLoading, navigate]);

  const refresh = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("profiles").select("id, email, display_name, access_status, created_at")
      .order("created_at", { ascending: false });
    const { data: r } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, string[]> = {};
    (r ?? []).forEach((row: any) => {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
    });
    setRoleMap(map);
    setProfiles((p ?? []) as Profile[]);
    setLoading(false);
  };

  const setStatus = async (id: string, status: Profile["access_status"]) => {
    const { error } = await supabase.from("profiles").update({ access_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`User ${status}`);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, access_status: status } : p)));
  };

  const deleteUser = async (p: Profile) => {
    const label = p.email || p.display_name || "this user";
    if (!confirm(`Permanently delete ${label}? They will need to sign up again with a new account.`)) return;
    const typed = prompt(`Type DELETE to confirm removing ${label}`);
    if (typed !== "DELETE") return toast.error("Deletion cancelled");
    setDeletingId(p.id);
    try {
      await deleteUserFn({ data: { userId: p.id } });
      toast.success("User deleted");
      setProfiles((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || isAdmin === null || loading) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only the super admin can manage users.</p>
      </div>
    );
  }

  const filtered = profiles.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (p.email ?? "").toLowerCase().includes(s) || (p.display_name ?? "").toLowerCase().includes(s);
  });

  const counts = {
    total: profiles.length,
    pending: profiles.filter((p) => p.access_status === "pending").length,
    approved: profiles.filter((p) => p.access_status === "approved").length,
    blocked: profiles.filter((p) => p.access_status === "blocked").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">User management</h1>
        <p className="text-sm text-muted-foreground">Approve, block, or revoke access for site users.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total, icon: UserCheck },
          { label: "Pending", value: counts.pending, icon: Clock },
          { label: "Approved", value: counts.approved, icon: ShieldCheck },
          { label: "Blocked", value: counts.blocked, icon: Ban },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{s.label}</span>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="border-0 focus-visible:ring-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const roles = roleMap[p.id] ?? [];
                const isSuper = roles.includes("super_admin");
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.access_status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">Approved</Badge>}
                      {p.access_status === "pending" && <Badge variant="secondary">Pending</Badge>}
                      {p.access_status === "blocked" && <Badge variant="destructive">Blocked</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {isSuper ? <Badge variant="outline">Super admin</Badge> : <span className="text-muted-foreground">User</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isSuper ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : (
                          <>
                            {p.access_status !== "approved" && (
                              <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "approved")}>
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                            )}
                            {p.access_status !== "pending" && (
                              <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "pending")}>
                                <Clock className="mr-1 h-3.5 w-3.5" /> Pending
                              </Button>
                            )}
                            {p.access_status !== "blocked" && (
                              <Button size="sm" variant="destructive" onClick={() => setStatus(p.id, "blocked")}>
                                <Ban className="mr-1 h-3.5 w-3.5" /> Block
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => deleteUser(p)} disabled={deletingId === p.id}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> {deletingId === p.id ? "Deleting…" : "Delete"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}