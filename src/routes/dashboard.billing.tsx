import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Copy, CheckCircle2, Clock, XCircle, CreditCard } from "lucide-react";

export const Route = createFileRoute("/dashboard/billing")({ component: BillingPage });

type Payment = {
  id: string; plan: string; amount: number; payment_method: string;
  transaction_id: string; status: string; admin_note: string | null;
  screenshot_url: string | null; created_at: string;
};

function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState<"self_serve" | "done_for_you">("self_serve");
  const [method, setMethod] = useState<"bkash" | "nagad" | "rocket" | "bank" | "other">("bkash");
  const [txnId, setTxnId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const [{ data: s }, { data: p }, { data: pay }] = await Promise.all([
        supabase.from("admin_payment_settings").select("*").eq("id", "default").maybeSingle(),
        supabase.from("profiles").select("subscription_plan, subscription_valid_until, subscription_status").eq("id", user.id).maybeSingle(),
        supabase.from("subscription_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setSettings(s);
      setProfile(p);
      setPayments((pay ?? []) as Payment[]);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const currentAmount = () => {
    if (!settings) return 0;
    if (plan === "self_serve") return Number(settings.self_serve_amount);
    const hasPaid = payments.some((p) => p.status === "approved" && p.plan === "done_for_you");
    return hasPaid ? Number(settings.done_for_you_recurring_amount) : Number(settings.done_for_you_first_amount);
  };

  const receivingNumber = () => {
    if (!settings) return null;
    if (method === "bkash") return settings.bkash_number;
    if (method === "nagad") return settings.nagad_number;
    if (method === "rocket") return settings.rocket_number;
    return null;
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!txnId.trim()) return toast.error("Transaction ID is required");
    setSubmitting(true);
    let screenshot_url: string | null = null;
    if (file) {
      const path = `payment-proofs/${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, { upsert: false });
      if (upErr) { setSubmitting(false); return toast.error(upErr.message); }
      const { data: pub } = supabase.storage.from("store-assets").getPublicUrl(path);
      screenshot_url = pub.publicUrl;
    }
    const finalAmount = amount ? Number(amount) : currentAmount();
    const { error } = await supabase.from("subscription_payments").insert({
      user_id: user.id, plan, amount: finalAmount, payment_method: method,
      transaction_id: txnId.trim(), sender_number: senderNumber || null,
      screenshot_url, note: note || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted for review");
    setTxnId(""); setSenderNumber(""); setNote(""); setFile(null); setAmount("");
    const { data: pay } = await supabase.from("subscription_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPayments((pay ?? []) as Payment[]);
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  const validUntil = profile?.subscription_valid_until ? new Date(profile.subscription_valid_until) : null;
  const daysLeft = validUntil ? Math.ceil((validUntil.getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground">Send payment to admin and submit the transaction proof for approval.</p>
      </div>

      {/* Current status */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold">
              {profile?.subscription_plan === "done_for_you" ? "Done-For-You" : profile?.subscription_plan === "self_serve" ? "Self-Serve" : "Not selected"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            {daysLeft > 0
              ? <Badge className="bg-emerald-500/15 text-emerald-700">Active · {daysLeft} days left</Badge>
              : <Badge variant="destructive">Expired — store deactivated</Badge>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valid until</p>
            <p className="text-sm">{validUntil ? validUntil.toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </div>

      {/* Payment form */}
      <form onSubmit={submit} className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>Choose plan</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPlan("self_serve")}
                className={`rounded-xl border p-3 text-left text-sm ${plan === "self_serve" ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="font-semibold">Self-Serve</div>
                <div className="text-xs text-muted-foreground">৳{settings?.self_serve_amount}/month</div>
              </button>
              <button type="button" onClick={() => setPlan("done_for_you")}
                className={`rounded-xl border p-3 text-left text-sm ${plan === "done_for_you" ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="font-semibold">Done-For-You</div>
                <div className="text-xs text-muted-foreground">৳{settings?.done_for_you_first_amount} first, then ৳{settings?.done_for_you_recurring_amount}</div>
              </button>
            </div>
          </div>

          <div>
            <Label>Payment method</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["bkash", "nagad", "rocket"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`rounded-xl border p-3 text-center text-sm capitalize ${method === m ? "border-primary bg-primary/5" : "border-border"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {receivingNumber() && (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Send ৳{currentAmount()} to this {method} number (Send Money):</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-semibold">{receivingNumber()}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => copy(receivingNumber()!)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              {settings?.instructions && <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">{settings.instructions}</p>}
            </div>
          )}
          {!receivingNumber() && (method === "bkash" || method === "nagad" || method === "rocket") && (
            <p className="text-xs text-destructive">Admin has not set up a {method} number yet. Please contact support.</p>
          )}
        </div>

        <div className="space-y-4">
          <div><Label>Transaction ID *</Label><Input value={txnId} onChange={(e) => setTxnId(e.target.value)} required placeholder="e.g. 8N7A2B4C" /></div>
          <div><Label>Your sending number</Label><Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="01XXXXXXXXX" /></div>
          <div><Label>Amount sent (৳)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(currentAmount())} /></div>
          <div>
            <Label>Payment screenshot</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {file && <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>}
          </div>
          <div><Label>Note (optional)</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={submitting}>
            <Upload className="mr-2 h-4 w-4" /> {submitting ? "Submitting…" : "Submit payment"}
          </Button>
        </div>
      </form>

      {/* History */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment history</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">৳{p.amount}</span>
                    <span className="text-xs text-muted-foreground capitalize">{p.plan.replace("_", " ")} · {p.payment_method}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">TxID: {p.transaction_id} · {new Date(p.created_at).toLocaleString()}</div>
                  {p.admin_note && <div className="mt-1 text-xs text-muted-foreground">Admin note: {p.admin_note}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {p.screenshot_url && <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View proof</a>}
                  {p.status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>}
                  {p.status === "pending" && <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>}
                  {p.status === "rejected" && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}