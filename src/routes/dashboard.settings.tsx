import { createFileRoute } from "@tanstack/react-router";
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
import { Copy, CheckCircle2, XCircle, Globe, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
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
    const token = `lovable-verify=${crypto.randomUUID()}`;
    const { error } = await supabase.from("stores").update({
      custom_domain: clean, domain_verification_token: token, domain_verified: false,
      domain_last_checked_at: null, domain_last_check_error: null,
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Domain saved. Add the DNS records below, then click Verify.");
    reload();
  };

  const disconnectDomain = async () => {
    const { error } = await supabase.from("stores").update({
      custom_domain: null, domain_verification_token: null, domain_verified: false,
      domain_last_checked_at: null, domain_last_check_error: null,
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

  const apexHost = form?.custom_domain ?? "";
  const wwwHost = apexHost ? `www.${apexHost}` : "";
  const findCheck = (key: string) => checks.find((c) => c.key === key);
  const RecordStatus = ({ check }: { check?: { status: "success" | "warning" | "error"; found: string; message: string } }) => {
    if (!check) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <XCircle className="h-3 w-3" /> Pending
        </span>
      );
    }
    if (check.status === "success") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700" title={check.message}>
        <XCircle className="h-3 w-3" /> Pending
      </span>
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("stores").update({
      name: form.name, bio: form.bio, logo_url: form.logo_url, whatsapp: form.whatsapp, theme: form.theme,
      banner_url: form.banner_url, banner_enabled: form.banner_enabled,
      footer_address: form.footer_address, footer_email: form.footer_email, footer_phone: form.footer_phone,
      footer_about_url: form.footer_about_url, footer_facebook_url: form.footer_facebook_url,
      footer_terms_url: form.footer_terms_url, footer_warranty_url: form.footer_warranty_url,
      footer_playstore_url: form.footer_playstore_url, footer_appstore_url: form.footer_appstore_url,
      footer_copyright: form.footer_copyright,
      delivery_inside_dhaka: Number(form.delivery_inside_dhaka ?? 0),
      delivery_outside_dhaka: Number(form.delivery_outside_dhaka ?? 0),
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
          <div><Label>Terms & Conditions URL</Label>
            <Input value={form.footer_terms_url ?? ""} onChange={(e) => setForm({ ...form, footer_terms_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Warranty Policy URL</Label>
            <Input value={form.footer_warranty_url ?? ""} onChange={(e) => setForm({ ...form, footer_warranty_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Google Play URL</Label>
            <Input value={form.footer_playstore_url ?? ""} onChange={(e) => setForm({ ...form, footer_playstore_url: e.target.value })} placeholder="https://play.google.com/…" /></div>
          <div><Label>App Store URL</Label>
            <Input value={form.footer_appstore_url ?? ""} onChange={(e) => setForm({ ...form, footer_appstore_url: e.target.value })} placeholder="https://apps.apple.com/…" /></div>
          <div className="sm:col-span-2"><Label>Copyright line</Label>
            <Input value={form.footer_copyright ?? ""} onChange={(e) => setForm({ ...form, footer_copyright: e.target.value })} placeholder={`${form.name ?? "Your Store"} © All rights reserved.`} /></div>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <Label className="text-base">Custom Domain</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect your own domain (e.g. <code>shop.example.com</code>). Once verified,
          your storefront will be served at that domain, and admin login will live at
          <code> yourdomain.com/admin</code>.
        </p>

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
                {form.domain_verified ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <XCircle className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={disconnectDomain}>Disconnect</Button>
            </div>

            {!form.domain_verified && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Add these DNS records at your registrar:</p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Value</th><th className="p-2 text-left">Status</th><th className="p-2"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2 font-mono">A</td>
                        <td className="p-2 font-mono">@</td>
                        <td className="p-2 font-mono">185.158.133.1</td>
                        <td className="p-2"><RecordStatus check={findCheck(`a-${apexHost}`)} /></td>
                        <td className="p-2 text-right"><Button type="button" size="sm" variant="ghost" onClick={() => copy("185.158.133.1")}><Copy className="h-3 w-3" /></Button></td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">A</td>
                        <td className="p-2 font-mono">www</td>
                        <td className="p-2 font-mono">185.158.133.1</td>
                        <td className="p-2"><RecordStatus check={findCheck(`a-${wwwHost}`)} /></td>
                        <td className="p-2 text-right"><Button type="button" size="sm" variant="ghost" onClick={() => copy("185.158.133.1")}><Copy className="h-3 w-3" /></Button></td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">TXT</td>
                        <td className="p-2 font-mono">_lovable-verify</td>
                        <td className="p-2 font-mono break-all">{form.domain_verification_token}</td>
                        <td className="p-2"><RecordStatus check={findCheck("txt-ownership")} /></td>
                        <td className="p-2 text-right"><Button type="button" size="sm" variant="ghost" onClick={() => copy(form.domain_verification_token)}><Copy className="h-3 w-3" /></Button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">DNS changes can take 5 minutes to a few hours to propagate.</p>
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={verify} disabled={verifying}>{verifying ? "Verifying…" : "Verify domain"}</Button>
                  <span className="text-xs text-muted-foreground">Auto-checking every 30s…</span>
                </div>
                {form.domain_last_checked_at && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                    <div className="text-muted-foreground">
                      Last check: <strong>{new Date(form.domain_last_checked_at).toLocaleTimeString()}</strong>
                    </div>
                    {form.domain_last_check_error && (
                      <>
                        <div className="mt-1 text-amber-700">⚠ {form.domain_last_check_error}</div>
                        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={retryVerify} disabled={verifying}>
                          {verifying ? "Retrying…" : "Retry verification"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.domain_verified && (
              <div className="space-y-2">
                {siteStatus === "live" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Live at <a className="underline font-medium" href={`https://${form.custom_domain}`} target="_blank" rel="noreferrer">{form.custom_domain}</a></span>
                  </div>
                ) : siteStatus === "setting_up" ? (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <Loader2 className="h-4 w-4 mt-0.5 animate-spin" />
                    <div>
                      <div className="font-medium">DNS verified — Site setting up</div>
                      <div className="text-xs mt-1">{siteMessage ?? "Cloudflare is still attaching your domain. This usually clears within a few minutes."}</div>
                      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => runVerify(false)} disabled={verifying}>
                        {verifying ? "Checking…" : "Check again"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>DNS verified for <a className="underline font-medium" href={`https://${form.custom_domain}`} target="_blank" rel="noreferrer">{form.custom_domain}</a></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}