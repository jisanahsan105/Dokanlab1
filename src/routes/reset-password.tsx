import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated!");
    navigate({ to: "/dashboard" });
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
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Verifying reset link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div><Label>Confirm password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}