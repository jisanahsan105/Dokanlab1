import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Save, ShieldOff, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard/payments")({ component: PaymentsAdmin });

type Row = {
  id: string; user_id: string; plan: string; amount: number; payment_method: string;
  transaction_id: string; sender_number: string | null; screenshot_url: string | null;
  note: string | null; status: "pending" | "approved" | "rejected";
  admin_note: string | null; created_at: string;
  profiles?: { email: string | null; display_name: string | null } | null;
};

function PaymentsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [emails, setEmails] = useState<Record<string, { email: string | null; display_name: string | null }>>({});
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reviewRow, setReviewRow] = useState<Row | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin");
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (!admin) return;
      await refresh();
    })();
  }, [user, authLoading, navigate]);

  const refresh = async () => {
    const [{ data: pays }, { data: prof }, { data: s }] = await Promise.all([
      supabase.from("subscription_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, display_name"),
      supabase.from("admin_payment_settings").select("*").eq("id", "default").maybeSingle(),
    ]);
    const map: Record<string, any> = {};
    (prof ?? []).forEach((p: any) => { map[p.id] = { email: p.email, display_name: p.display_name }; });
    setEmails(map);
    setRows((pays ?? []) as Row[]);
    setSettings(s);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from("admin_payment_settings").update({
      bkash_number: settings.bkash_number, nagad_number: settings.nagad_number,
      rocket_number: settings.rocket_number, bank_details: settings.bank_details,
      self_serve_amount: Number(settings.self_serve_amount),
      done_for_you_first_amount: Number(settings.done_for_you_first_amount),
      done_for_you_recurring_amount: Number(settings.done_for_you_recurring_amount),
      instructions: settings.instructions,
    }).eq("id", "default");
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!reviewRow) return;
    const { error } = await supabase.from("subscription_payments").update({
      status, admin_note: adminNote || null, reviewed_by: user!.id,
    }).eq("id", reviewRow.id);
    if (error) return toast.error(error.message);
    toast.success(`Payment ${status}`);
    setReviewRow(null); setAdminNote("");
    await refresh();
  };

  if (authLoading || isAdmin === null) return <div className="text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">Super admin only.</p>
      </div>
    );
  }

  const filtered = tab === "all" ? rows : rows.filter((r) => r.status === tab);
  const counts = { pending: rows.filter((r) => r.status === "pending").length, approved: rows.filter((r) => r.status === "approved").length, rejected: rows.filter((r) => r.status === "rejected").length };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Review payment submissions and set your receiving numbers.</p>
      </div>

      {/* Admin payment settings */}
      {settings && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-semibold">Your receiving numbers & pricing</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>bKash number</Label><Input value={settings.bkash_number ?? ""} onChange={(e) => setSettings({ ...settings, bkash_number: e.target.value })} placeholder="01XXXXXXXXX" /></div>
            <div><Label>Nagad number</Label><Input value={settings.nagad_number ?? ""} onChange={(e) => setSettings({ ...settings, nagad_number: e.target.value })} placeholder="01XXXXXXXXX" /></div>
            <div><Label>Rocket number</Label><Input value={settings.rocket_number ?? ""} onChange={(e) => setSettings({ ...settings, rocket_number: e.target.value })} placeholder="01XXXXXXXXX-X" /></div>
            <div><Label>Self-Serve amount (৳)</Label><Input type="number" value={settings.self_serve_amount ?? 0} onChange={(e) => setSettings({ ...settings, self_serve_amount: e.target.value })} /></div>
            <div><Label>Done-For-You 1st month (৳)</Label><Input type="number" value={settings.done_for_you_first_amount ?? 0} onChange={(e) => setSettings({ ...settings, done_for_you_first_amount: e.target.value })} /></div>
            <div><Label>Done-For-You recurring (৳)</Label><Input type="number" value={settings.done_for_you_recurring_amount ?? 0} onChange={(e) => setSettings({ ...settings, done_for_you_recurring_amount: e.target.value })} /></div>
          </div>
          <div className="mt-4"><Label>Bank / other details (optional)</Label><Textarea rows={2} value={settings.bank_details ?? ""} onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })} /></div>
          <div className="mt-4"><Label>Instructions shown to users</Label><Textarea rows={3} value={settings.instructions ?? ""} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} placeholder="e.g. Send Money korun, Cash Out noy. 24 ghontar moddhe approve kora hobe." /></div>
          <div className="mt-4"><Button onClick={saveSettings} disabled={savingSettings}><Save className="mr-2 h-4 w-4" /> {savingSettings ? "Saving…" : "Save settings"}</Button></div>
        </div>
      )}

      {/* Submissions */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          {(["pending", "approved", "rejected", "all"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {t}{t !== "all" && ` (${counts[t]})`}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const u = emails[r.user_id];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u?.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u?.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{r.plan.replace("_", " ")}</td>
                    <td className="px-4 py-3 capitalize">{r.payment_method}</td>
                    <td className="px-4 py-3 font-semibold">৳{r.amount}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.transaction_id}</td>
                    <td className="px-4 py-3">
                      {r.status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>}
                      {r.status === "pending" && <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>}
                      {r.status === "rejected" && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setReviewRow(r); setAdminNote(r.admin_note ?? ""); }}>
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No submissions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!reviewRow} onOpenChange={(o) => !o && setReviewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review payment</DialogTitle></DialogHeader>
          {reviewRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">User: </span>{emails[reviewRow.user_id]?.email}</div>
                <div><span className="text-muted-foreground">Amount: </span>৳{reviewRow.amount}</div>
                <div><span className="text-muted-foreground">Plan: </span>{reviewRow.plan}</div>
                <div><span className="text-muted-foreground">Method: </span>{reviewRow.payment_method}</div>
                <div><span className="text-muted-foreground">Txn ID: </span><span className="font-mono">{reviewRow.transaction_id}</span></div>
                <div><span className="text-muted-foreground">Sender: </span>{reviewRow.sender_number ?? "—"}</div>
              </div>
              {reviewRow.note && <div><span className="text-muted-foreground">User note: </span>{reviewRow.note}</div>}
              {reviewRow.screenshot_url && (
                <div>
                  <a href={reviewRow.screenshot_url} target="_blank" rel="noreferrer" className="mb-2 inline-flex items-center gap-1 text-xs text-primary underline">
                    <ExternalLink className="h-3 w-3" /> Open full-size
                  </a>
                  <img src={reviewRow.screenshot_url} alt="proof" className="max-h-64 w-full rounded-lg border border-border object-contain" />
                </div>
              )}
              <div>
                <Label>Admin note (optional)</Label>
                <Textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="destructive" onClick={() => decide("rejected")}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                <Button onClick={() => decide("approved")}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve & extend 30 days</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}