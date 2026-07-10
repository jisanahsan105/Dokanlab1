import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/store/success")({ component: SuccessPage });

function SuccessPage() {
  const { slug } = Route.useParams();
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      setStore(data);
    })();
  }, [slug]);

  const primary = store?.theme === "digital" ? "#6366F1" : "#059669";

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: `${primary}20`, color: primary }}>
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Order placed successfully!</h1>
        <p className="mt-2 text-sm text-slate-500">Thank you for your order. We'll contact you shortly to confirm the details.</p>
        <Link to="/store/$slug" params={{ slug }}>
          <Button className="mt-6 w-full" style={{ background: primary }}>Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
