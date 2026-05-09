import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const { store, reload } = useMyStore();
  const [form, setForm] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (store) setForm(store); }, [store]);
  if (!form) return null;

  const upload = async (file: File, kind: "logo" | "banner") => {
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const path = `${form.id}/${kind}-${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    const url = data.publicUrl;
    const patch: any = kind === "logo" ? { logo_url: url } : { banner_url: url };
    setForm({ ...form, ...patch });
    // Persist immediately so it survives even if the user forgets to click Save
    const { error: saveErr } = await supabase.from("stores").update(patch).eq("id", form.id);
    if (saveErr) toast.error(saveErr.message);
    else { toast.success(`${kind === "logo" ? "Logo" : "Banner"} updated`); reload(); }
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("stores").update({
      name: form.name, bio: form.bio, logo_url: form.logo_url, whatsapp: form.whatsapp, theme: form.theme,
      banner_url: form.banner_url, banner_enabled: form.banner_enabled,
    }).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    reload();
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Store settings</h1>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div><Label>Store name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Bio</Label><Textarea value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div><Label>WhatsApp number</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="8801XXXXXXXXX" /></div>
        <div>
          <Label>Logo</Label>
          <p className="text-xs text-muted-foreground mb-2">Recommended size: <strong>200 × 200 px</strong> (square, PNG/JPG, max 2 MB)</p>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} disabled={uploadingLogo} />
          {uploadingLogo && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
          {form.logo_url && <img src={form.logo_url} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover border border-border" />}
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Storefront Banner</Label>
            <p className="text-xs text-muted-foreground mt-1">Shown at the top of your store homepage.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{form.banner_enabled ? "Enabled" : "Disabled"}</span>
            <Switch checked={!!form.banner_enabled} onCheckedChange={(v) => setForm({ ...form, banner_enabled: v })} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Recommended size: <strong>1600 × 500 px</strong> (wide, JPG/PNG, max 4 MB)</p>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "banner")} disabled={uploadingBanner} />
          {uploadingBanner && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
          {form.banner_url && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <img src={form.banner_url} alt="" className="w-full max-h-48 object-cover" />
            </div>
          )}
          {form.banner_url && (
            <Button type="button" variant="outline" size="sm" className="mt-2"
              onClick={async () => {
                setForm({ ...form, banner_url: null });
                await supabase.from("stores").update({ banner_url: null }).eq("id", form.id);
                reload(); toast.success("Banner removed");
              }}>Remove banner</Button>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
        <Label>Storefront theme</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "physical", label: "Physical Goods", desc: "Grid layout with prominent product images" },
            { v: "digital", label: "Digital Products", desc: "Clean, download-focused layout" },
          ].map((t) => (
            <button type="button" key={t.v} onClick={() => setForm({ ...form, theme: t.v })}
              className={`rounded-xl border p-4 text-left transition ${form.theme === t.v ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}