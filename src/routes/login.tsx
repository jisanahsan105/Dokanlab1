import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent! Check your email.");
    setResetOpen(false);
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
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div className="text-right">
            <button type="button" onClick={() => { setResetEmail(email); setResetOpen(true); }} className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Login"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
        {resetOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={() => setResetOpen(false)}>
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold">Reset your password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleReset} className="mt-4 space-y-4">
                <div><Label>Email</Label><Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required autoFocus /></div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setResetOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={resetLoading}>{resetLoading ? "Sending…" : "Send link"}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}