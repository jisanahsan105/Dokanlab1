import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useMyStore() {
  const { user } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.from("stores").select("*").eq("owner_id", user.id).maybeSingle();
    setStore(data);
    setLoading(false);
  };
  useEffect(() => { if (user) reload(); }, [user]);
  return { store, loading, reload };
}