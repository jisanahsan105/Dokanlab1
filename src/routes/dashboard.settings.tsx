import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/lib/use-my-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { verifyDomainDns } from "@/lib/domain.functions";
import { AlertTriangle, CheckCircle2, ExternalLink, Globe, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const { store, reload } = useMyStore();
  const [form, setForm] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifiedHealthCheckKey = useRef<string | null>(null);
  const [checks, setChecks] = useState<Array<{ key: string; status: "success" | "warning" | "error"; found: string; message: string; checkedAt: string }>>([]);
  const [siteStatus, setSiteStatus] = useState<"live" | "setting_up" | "dns_only" | null>(null);
  const [siteMessage, setSiteMessage] = useState<string | null>(null);
  const verifyFn = useServerFn(verifyDomainDns);

  useEffect(() => { if (store) setForm(store); }, [store]);
  useEffect(() => { if (store?.custom_domain) setDomainInput(store.custom_domain); }, [store]);
  // Hydrate cached status so reload shows last known state immediately
  useEffect(() => {
    if (store?.site_status) {
      setSiteStatus(store.site_status as any);
      setSiteMessage(store.site_status_message ?? null);
    }
  }, [store?.site_status, store?.site_status_message]);

  // Auto-poll every 30s while a domain is connected but not yet verified.
  // Must run BEFORE any early return to keep hook order stable.
  useEffect(() => {
    if (!form?.custom_domain) return;
    if (form?.domain_verified && siteStatus === "live") return;
    const id = setInterval(() => { runVerify(true); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.custom_domain, form?.domain_verified, form?.domain_verification_token, siteStatus]);

  // Re-check immediately when the tab regains focus or comes back online,
  // so users see the live state without waiting for the 30s tick.
  useEffect(() => {
    if (!form?.custom_domain) return;
    if (form?.domain_verified && siteStatus === "live") return;
    const trigger = () => { if (document.visibilityState === "visible") runVerify(true); };
    window.addEventListener("focus", trigger);
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    return () => {
      window.removeEventListener("focus", trigger);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.custom_domain, form?.domain_verified, siteStatus]);

  // Re-check previously verified domains once when Settings opens, so broken DNS is not shown as live.
  useEffect(() => {
    if (!form?.id || !form?.custom_domain || !form?.domain_verified || !form?.domain_verification_token) return;
    const key = `${form.id}:${form.custom_domain}:${form.domain_verification_token}`;
    if (verifiedHealthCheckKey.current === key) return;
    verifiedHealthCheckKey.current = key;
    runVerify(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, form?.custom_domain, form?.domain_verified, form?.domain_verification_token]);

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

  const connectDomain = async () => {
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) return toast.error("Enter a valid domain (e.g. shop.example.com)");
    const { error } = await supabase.from("stores").update({
      custom_domain: clean,
      domain_verification_token: null,
      domain_verified: true,
      domain_last_checked_at: new Date().toISOString(),
      domain_last_check_error: null,
      site_status: "live",
      site_status_message: "Routing saved after domain setup in Lovable",
      site_status_checked_at: new Date().toISOString(),
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Domain routing saved for this store");
    reload();
  };

  const disconnectDomain = async () => {
    const { error } = await supabase.from("stores").update({
      custom_domain: null, domain_verification_token: null, domain_verified: false,
      domain_last_checked_at: null, domain_last_check_error: null,
      site_status: null, site_status_message: null, site_status_checked_at: null,
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    setDomainInput("");
    toast.success("Domain disconnected");
    reload();
  };

  async function runVerify(silent = false) {
    if (!form.custom_domain || !form.domain_verification_token) return;
    if (!silent) setVerifying(true);
    const checkedAt = new Date().toISOString();
    try {
      const res = await verifyFn({ data: { domain: form.custom_domain, token: form.domain_verification_token } });
      if ((res as any).checks) setChecks((res as any).checks);
      const nextStatus = (res as any).siteStatus ?? null;
      const nextMessage = (res as any).siteMessage ?? null;
      if (nextStatus) {
        setSiteStatus(nextStatus);
        setSiteMessage(nextMessage);
        // Persist so other sessions / reload show fresh state
        if (nextStatus !== form.site_status || nextMessage !== form.site_status_message) {
          await supabase.from("stores").update({
            site_status: nextStatus,
            site_status_message: nextMessage,
            site_status_checked_at: checkedAt,
          }).eq("id", form.id);
          if (silent && nextStatus === "live" && form.site_status !== "live") {
            toast.success("✅ Your site is now live with SSL!");
          }
        }
      }
      if (!res.ok) {
        await supabase.from("stores").update({
          domain_verified: false, domain_last_checked_at: checkedAt, domain_last_check_error: res.error,
        }).eq("id", form.id);
        if (!silent) toast.error(res.error);
        reload();
        if (!silent) setVerifying(false);
        return;
      }
      const { error } = await supabase.from("stores").update({
        custom_domain: res.canonicalDomain ?? form.custom_domain,
        domain_verified: true, domain_last_checked_at: checkedAt, domain_last_check_error: null,
      }).eq("id", form.id);
      if (error) toast.error(error.message);
      else { toast.success("Domain verified! Your store is live on " + form.custom_domain); reload(); }
    } catch (e: any) {
      const msg = e?.message ?? "Verification failed";
      await supabase.from("stores").update({
        domain_last_checked_at: checkedAt, domain_last_check_error: msg,
      }).eq("id", form.id);
      if (!silent) toast.error(msg);
      reload();
    }
    if (!silent) setVerifying(false);
  }
  const verify = () => runVerify(false);
  const retryVerify = async () => {
    // Clear last error first so the UI updates immediately, then re-run verification now
    await supabase.from("stores").update({ domain_last_check_error: null }).eq("id", form.id);
    setForm({ ...form, domain_last_check_error: null });
    await runVerify(false);
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  const deleteStore = async () => {
    if (!form?.id) return;
    const name = form.name ?? "this store";
    if (!confirm(`Delete ${name}? This permanently removes products, orders, categories, reviews, messages, and settings.`)) return;
    const typed = prompt(`Type DELETE to permanently delete ${name}`);
    if (typed !== "DELETE") return toast.error("Store deletion cancelled");
    const { error } = await supabase.rpc("delete_store_cascade", { _store_id: form.id });
    if (error) return toast.error(error.message);
    toast.success("Store deleted");
    navigate({ to: "/dashboard" });
    window.setTimeout(() => window.location.reload(), 300);
  };

  const apexHost = form?.custom_domain ?? domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("stores").update({
      name: form.name, bio: form.bio, logo_url: form.logo_url, whatsapp: form.whatsapp, theme: form.theme,
      banner_url: form.banner_url, banner_enabled: form.banner_enabled,
      footer_address: form.footer_address, footer_email: form.footer_email, footer_phone: form.footer_phone,
      product_whatsapp_url: form.product_whatsapp_url,
      footer_about_url: form.footer_about_url, footer_facebook_url: form.footer_facebook_url,
      footer_terms_url: form.footer_terms_url, footer_warranty_url: form.footer_warranty_url,
      footer_terms_text: form.footer_terms_text, footer_warranty_text: form.footer_warranty_text,
      footer_return_text: form.footer_return_text, footer_return_url: form.footer_return_url,
      footer_privacy_text: form.footer_privacy_text, footer_privacy_url: form.footer_privacy_url,
      footer_playstore_url: form.footer_playstore_url, footer_appstore_url: form.footer_appstore_url,
      footer_copyright: form.footer_copyright,
      delivery_inside_dhaka: Number(form.delivery_inside_dhaka ?? 0),
      delivery_outside_dhaka: Number(form.delivery_outside_dhaka ?? 0),
      // SEO / Brand
      meta_title: form.meta_title, meta_description: form.meta_description,
      favicon_url: form.favicon_url, og_image_url: form.og_image_url,
      tagline: form.tagline, brand_primary_color: form.brand_primary_color,
      // Announcement
      announcement_enabled: !!form.announcement_enabled,
      announcement_text: form.announcement_text,
      // Payment methods
      payment_cod_enabled: !!form.payment_cod_enabled,
      payment_bkash_enabled: !!form.payment_bkash_enabled, payment_bkash_number: form.payment_bkash_number,
      payment_nagad_enabled: !!form.payment_nagad_enabled, payment_nagad_number: form.payment_nagad_number,
      payment_rocket_enabled: !!form.payment_rocket_enabled, payment_rocket_number: form.payment_rocket_number,
      payment_instructions: form.payment_instructions,
      // Delivery zones (JSONB)
      delivery_zones: (form.delivery_zones ?? []).filter((z: any) => z?.name?.trim()).map((z: any) => ({
        name: String(z.name).trim(), charge: Number(z.charge ?? 0),
      })),
      // Business hours + holiday
      business_hours: form.business_hours, business_days: form.business_days,
      holiday_mode: !!form.holiday_mode, holiday_message: form.holiday_message,
      min_order_amount: Number(form.min_order_amount ?? 0),
      // Social
      instagram_url: form.instagram_url, youtube_url: form.youtube_url,
      tiktok_url: form.tiktok_url, whatsapp_channel_url: form.whatsapp_channel_url,
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
          <Label>Product page WhatsApp link</Label>
          <Input
            value={form.product_whatsapp_url ?? ""}
            onChange={(e) => setForm({ ...form, product_whatsapp_url: e.target.value })}
            placeholder="https://wa.me/8801XXXXXXXXX?text=Hi"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown as a green WhatsApp button on every product page (below the call-to-order box).
          </p>
        </div>
        <div>
          <Label>Logo</Label>
          <p className="text-xs text-muted-foreground mb-2">Recommended size: <strong>200 × 200 px</strong> (square, PNG/JPG, max 2 MB)</p>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} disabled={uploadingLogo} />
          {uploadingLogo && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
          {form.logo_url && <img src={form.logo_url} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover border border-border" />}
        </div>
      </div>

      {/* Banner */}
      {/* Delivery charges */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Delivery charges</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Shown on the product page and used in the checkout area dropdown.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>ঢাকার ভিতরে (Inside Dhaka) ৳</Label>
            <Input type="number" min={0} value={form.delivery_inside_dhaka ?? 0}
              onChange={(e) => setForm({ ...form, delivery_inside_dhaka: e.target.value })} />
          </div>
          <div>
            <Label>ঢাকার বাহিরে (Outside Dhaka) ৳</Label>
            <Input type="number" min={0} value={form.delivery_outside_dhaka ?? 0}
              onChange={(e) => setForm({ ...form, delivery_outside_dhaka: e.target.value })} />
          </div>
        </div>
      </div>

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

      {/* Footer customization */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Storefront Footer</Label>
          <p className="text-xs text-muted-foreground mt-1">Shown at the bottom of every storefront page. Leave any field blank to hide it.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Address</Label>
            <Textarea rows={2} value={form.footer_address ?? ""} onChange={(e) => setForm({ ...form, footer_address: e.target.value })} placeholder="143/a, Adorsho Road, Mirpur 10, Dhaka-1216" /></div>
          <div><Label>Email</Label>
            <Input value={form.footer_email ?? ""} onChange={(e) => setForm({ ...form, footer_email: e.target.value })} placeholder="support@yourstore.com" /></div>
          <div><Label>Phone</Label>
            <Input value={form.footer_phone ?? ""} onChange={(e) => setForm({ ...form, footer_phone: e.target.value })} placeholder="01XXXXXXXXX" /></div>
          <div><Label>About Us URL</Label>
            <Input value={form.footer_about_url ?? ""} onChange={(e) => setForm({ ...form, footer_about_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Facebook Page URL</Label>
            <Input value={form.footer_facebook_url ?? ""} onChange={(e) => setForm({ ...form, footer_facebook_url: e.target.value })} placeholder="https://facebook.com/…" /></div>
          <div className="sm:col-span-2">
            <Label>Terms & Conditions</Label>
            <Textarea rows={5} value={form.footer_terms_text ?? ""}
              onChange={(e) => setForm({ ...form, footer_terms_text: e.target.value })}
              placeholder="Write your terms & conditions here. It will appear as a page in the footer when a customer clicks the link." />
            <p className="mt-1 text-xs text-muted-foreground">Or provide an external URL instead:</p>
            <Input className="mt-1" value={form.footer_terms_url ?? ""}
              onChange={(e) => setForm({ ...form, footer_terms_url: e.target.value })}
              placeholder="https://… (optional, used only if text is empty)" />
          </div>
          <div className="sm:col-span-2">
            <Label>Warranty Policy</Label>
            <Textarea rows={5} value={form.footer_warranty_text ?? ""}
              onChange={(e) => setForm({ ...form, footer_warranty_text: e.target.value })}
              placeholder="Write your warranty policy here. It will appear as a page in the footer when a customer clicks the link." />
            <p className="mt-1 text-xs text-muted-foreground">Or provide an external URL instead:</p>
            <Input className="mt-1" value={form.footer_warranty_url ?? ""}
              onChange={(e) => setForm({ ...form, footer_warranty_url: e.target.value })}
              placeholder="https://… (optional, used only if text is empty)" />
          </div>
          <div><Label>Google Play URL</Label>
            <Input value={form.footer_playstore_url ?? ""} onChange={(e) => setForm({ ...form, footer_playstore_url: e.target.value })} placeholder="https://play.google.com/…" /></div>
          <div><Label>App Store URL</Label>
            <Input value={form.footer_appstore_url ?? ""} onChange={(e) => setForm({ ...form, footer_appstore_url: e.target.value })} placeholder="https://apps.apple.com/…" /></div>
          <div className="sm:col-span-2"><Label>Copyright line</Label>
            <Input value={form.footer_copyright ?? ""} onChange={(e) => setForm({ ...form, footer_copyright: e.target.value })} placeholder={`${form.name ?? "Your Store"} © All rights reserved.`} /></div>
        </div>
      </div>

      {/* SEO & Brand */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">SEO & Brand</Label>
          <p className="text-xs text-muted-foreground mt-1">Google / Facebook e apnar store kemon dekhabe.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Tagline (short one-line brand line)</Label>
            <Input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Bangladesh's freshest online shop" /></div>
          <div className="sm:col-span-2"><Label>Meta title (browser tab + Google)</Label>
            <Input maxLength={70} value={form.meta_title ?? ""} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder={form.name ?? "Your Store"} />
            <p className="mt-1 text-xs text-muted-foreground">Max 70 characters. Blank thakle store name use hobe.</p></div>
          <div className="sm:col-span-2"><Label>Meta description (Google preview text)</Label>
            <Textarea rows={2} maxLength={160} value={form.meta_description ?? ""} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="1-2 line description of your store" />
            <p className="mt-1 text-xs text-muted-foreground">Max 160 characters.</p></div>
          <div><Label>Favicon URL (browser tab icon)</Label>
            <Input value={form.favicon_url ?? ""} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://…/favicon.png" />
            <p className="mt-1 text-xs text-muted-foreground">Recommended: 64×64 or 128×128 PNG.</p></div>
          <div><Label>Share image (Facebook/WhatsApp preview)</Label>
            <Input value={form.og_image_url ?? ""} onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} placeholder="https://…/share.jpg" />
            <p className="mt-1 text-xs text-muted-foreground">Recommended: 1200×630 JPG/PNG.</p></div>
          <div className="sm:col-span-2"><Label>Brand primary color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" className="h-10 w-16 p-1" value={form.brand_primary_color || "#10B981"} onChange={(e) => setForm({ ...form, brand_primary_color: e.target.value })} />
              <Input className="flex-1" value={form.brand_primary_color ?? ""} onChange={(e) => setForm({ ...form, brand_primary_color: e.target.value })} placeholder="#10B981 (blank = default theme color)" />
              {form.brand_primary_color && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, brand_primary_color: null })}>Reset</Button>
              )}
            </div></div>
        </div>
      </div>

      {/* Announcement bar */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Announcement bar</Label>
            <p className="text-xs text-muted-foreground mt-1">Storefront er ekdom uporer rolling message (offer, delivery notice, etc.)</p>
          </div>
          <Switch checked={!!form.announcement_enabled} onCheckedChange={(v) => setForm({ ...form, announcement_enabled: v })} />
        </div>
        <div>
          <Label>Message</Label>
          <Input value={form.announcement_text ?? ""} onChange={(e) => setForm({ ...form, announcement_text: e.target.value })} placeholder="🎉 Free delivery on orders over ৳1000!" />
        </div>
      </div>

      {/* Business hours & holiday */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Business hours & Holiday mode</Label>
          <p className="text-xs text-muted-foreground mt-1">Store open time show hobe footer e. Holiday mode on korle order neya bondho.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Open hours</Label>
            <Input value={form.business_hours ?? ""} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} placeholder="10:00 AM – 10:00 PM" /></div>
          <div><Label>Open days</Label>
            <Input value={form.business_days ?? ""} onChange={(e) => setForm({ ...form, business_days: e.target.value })} placeholder="Sat – Thu (Friday closed)" /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="font-semibold text-sm">Holiday mode</div>
            <p className="text-xs text-muted-foreground">On korle store e big red banner + checkout disabled.</p>
          </div>
          <Switch checked={!!form.holiday_mode} onCheckedChange={(v) => setForm({ ...form, holiday_mode: v })} />
        </div>
        {form.holiday_mode && (
          <div><Label>Holiday message</Label>
            <Textarea rows={2} value={form.holiday_message ?? ""} onChange={(e) => setForm({ ...form, holiday_message: e.target.value })} placeholder="আমরা Eid chuti-te achi. 20 April theke order neya shuru hobe." /></div>
        )}
      </div>

      {/* Minimum order */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
        <Label className="text-base">Minimum order amount (৳)</Label>
        <Input type="number" min={0} value={form.min_order_amount ?? 0} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} placeholder="0" />
        <p className="text-xs text-muted-foreground">0 = no minimum. Set korle checkout e ei amount er niche order block hobe.</p>
      </div>

      {/* Delivery zones */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Delivery zones (custom areas)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add korle checkout e ei zone gulo dekhabe (Inside/Outside Dhaka replace hobe). Empty rakhle Inside/Outside Dhaka use hobe.
          </p>
        </div>
        <div className="space-y-2">
          {(form.delivery_zones ?? []).map((z: any, i: number) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <Input placeholder="Zone name (e.g. Dhaka City)" value={z.name ?? ""}
                onChange={(e) => {
                  const next = [...(form.delivery_zones ?? [])];
                  next[i] = { ...next[i], name: e.target.value };
                  setForm({ ...form, delivery_zones: next });
                }} />
              <Input type="number" min={0} placeholder="Charge ৳" value={z.charge ?? 0}
                onChange={(e) => {
                  const next = [...(form.delivery_zones ?? [])];
                  next[i] = { ...next[i], charge: e.target.value };
                  setForm({ ...form, delivery_zones: next });
                }} />
              <Button type="button" variant="outline" size="sm"
                onClick={() => setForm({ ...form, delivery_zones: (form.delivery_zones ?? []).filter((_: any, j: number) => j !== i) })}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => setForm({ ...form, delivery_zones: [...(form.delivery_zones ?? []), { name: "", charge: 0 }] })}>
            + Add zone
          </Button>
        </div>
      </div>

      {/* Payment methods */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Payment methods (checkout options)</Label>
          <p className="text-xs text-muted-foreground mt-1">Customer ki ki payment method use korte parben — toggle korun.</p>
        </div>
        {[
          { key: "cod", label: "Cash on Delivery (COD)", hasNumber: false },
          { key: "bkash", label: "bKash (manual)", hasNumber: true },
          { key: "nagad", label: "Nagad (manual)", hasNumber: true },
          { key: "rocket", label: "Rocket (manual)", hasNumber: true },
        ].map(m => {
          const enKey = `payment_${m.key}_enabled` as const;
          const numKey = `payment_${m.key}_number` as const;
          return (
            <div key={m.key} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{m.label}</div>
                <Switch checked={!!form[enKey]} onCheckedChange={(v) => setForm({ ...form, [enKey]: v })} />
              </div>
              {m.hasNumber && form[enKey] && (
                <Input value={form[numKey] ?? ""} onChange={(e) => setForm({ ...form, [numKey]: e.target.value })}
                  placeholder={`${m.label.split(" ")[0]} personal/merchant number`} />
              )}
            </div>
          );
        })}
        <div>
          <Label>Extra payment instructions (shown on checkout)</Label>
          <Textarea rows={2} value={form.payment_instructions ?? ""} onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
            placeholder="Send money kore transaction ID Notes e likhun." />
        </div>
      </div>

      {/* Policy pages: Return + Privacy */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Policy pages (footer)</Label>
          <p className="text-xs text-muted-foreground mt-1">Text likhle footer e page akare show hobe. URL diye external link o dite paren.</p>
        </div>
        <div>
          <Label>Return & Refund Policy</Label>
          <Textarea rows={4} value={form.footer_return_text ?? ""}
            onChange={(e) => setForm({ ...form, footer_return_text: e.target.value })}
            placeholder="Write your return & refund policy here." />
          <Input className="mt-1" value={form.footer_return_url ?? ""}
            onChange={(e) => setForm({ ...form, footer_return_url: e.target.value })}
            placeholder="https://… (optional external URL — used only if text is empty)" />
        </div>
        <div>
          <Label>Privacy Policy</Label>
          <Textarea rows={4} value={form.footer_privacy_text ?? ""}
            onChange={(e) => setForm({ ...form, footer_privacy_text: e.target.value })}
            placeholder="Write your privacy policy here." />
          <Input className="mt-1" value={form.footer_privacy_url ?? ""}
            onChange={(e) => setForm({ ...form, footer_privacy_url: e.target.value })}
            placeholder="https://… (optional external URL — used only if text is empty)" />
        </div>
      </div>

      {/* Social links */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base">Social media links</Label>
          <p className="text-xs text-muted-foreground mt-1">Footer e social icon akare show hobe.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Instagram URL</Label>
            <Input value={form.instagram_url ?? ""} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/…" /></div>
          <div><Label>YouTube URL</Label>
            <Input value={form.youtube_url ?? ""} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/@…" /></div>
          <div><Label>TikTok URL</Label>
            <Input value={form.tiktok_url ?? ""} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} placeholder="https://tiktok.com/@…" /></div>
          <div><Label>WhatsApp Channel URL</Label>
            <Input value={form.whatsapp_channel_url ?? ""} onChange={(e) => setForm({ ...form, whatsapp_channel_url: e.target.value })} placeholder="https://whatsapp.com/channel/…" /></div>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <Label className="text-base">Custom Domain</Label>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Complete the Lovable domain setup first</div>
              <p className="mt-1 text-xs leading-relaxed">
                Domain SSL and hosting must be connected from Project Settings → Domains. After it becomes Active there, save the same domain below so this store opens on that domain.
              </p>
              <a href="https://docs.lovable.dev/features/custom-domain" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline">
                Custom domain setup guide <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {!form.custom_domain ? (
          <div className="flex gap-2">
            <Input placeholder="shop.example.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
            <Button type="button" onClick={connectDomain}>Connect</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{form.custom_domain}</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={disconnectDomain}>Disconnect</Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>Store routing saved for <a className="underline font-medium" href={`https://${form.custom_domain}`} target="_blank" rel="noreferrer">{form.custom_domain}</a></span>
              </div>
              <p className="text-xs text-muted-foreground">
                If this domain still fails in the browser, finish the domain connection in Project Settings → Domains and wait for SSL to become Active.
              </p>
              </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-card p-6 space-y-4 shadow-sm">
        <div>
          <Label className="text-base text-destructive">Danger zone</Label>
          <p className="mt-1 text-xs text-muted-foreground">Delete this store permanently, including products, orders, categories, reviews, messages, and settings.</p>
        </div>
        <Button type="button" variant="destructive" onClick={deleteStore}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete store
        </Button>
      </div>

      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}