import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingBag, Check } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"self_serve" | "done_for_you">("self_serve");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name, plan } },
    });
    if (error) return toast.error(error.message);
    // Save selected plan to their profile if session exists (auto-confirm on)
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("profiles").update({ subscription_plan: plan }).eq("id", uid);
    }
    setLoading(false);
    if (data.session) {
      toast.success("Account created! Waiting for admin approval.");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Account created! Check your email to confirm, then login.");
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link to="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
            <ShoppingBag className="h-4 w-4 text-primary-foreground" />
          </span>
          DokanLab
        </Link>
        <h1 className="text-2xl font-bold">Start your business</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your free merchant account.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
          <div>
            <Label>Choose your plan</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                { id: "self_serve", title: "Self-Serve", desc: "নিজে সব করবেন — ৳499/মাস" },
                { id: "done_for_you", title: "Done-For-You", desc: "১ম মাস ৳999, তারপর ৳499/মাস" },
              ] as const).map((p) => (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                  className={`relative rounded-xl border p-3 text-left transition ${plan === p.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-accent"}`}>
                  {plan === p.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Have an account? <Link to="/login" className="font-medium text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}