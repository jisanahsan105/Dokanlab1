import { createServerFn } from "@tanstack/react-start";

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResp = { Status: number; Answer?: DohAnswer[] };
type CheckStatus = "success" | "warning" | "error";
type DomainCheck = {
  key: string;
  type: "TXT" | "A" | "HTTPS" | "DOMAIN";
  host: string;
  expected: string;
  found: string;
  status: CheckStatus;
  message: string;
  checkedAt: string;
};

const LOVABLE_IP = "185.158.133.1";

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

function requiredARecordHosts(domain: string) {
  const labels = domain.split(".").filter(Boolean);
  return labels.length === 2 ? [domain, `www.${domain}`] : [domain];
}

async function doh(name: string, type: "A" | "TXT"): Promise<DohAnswer[]> {
  const r = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: "application/dns-json" } },
  );
  if (!r.ok) return [];
  const j = (await r.json()) as DohResp;
  return j.Answer ?? [];
}

export const verifyDomainDns = createServerFn({ method: "POST" })
  .inputValidator((d: { domain: string; token: string }) => d)
  .handler(async ({ data }) => {
    const domain = normalizeDomain(data.domain);
    const checkedAt = new Date().toISOString();
    const checks: DomainCheck[] = [];
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      checks.push({
        key: "domain-format",
        type: "DOMAIN",
        host: data.domain,
        expected: "Valid domain like example.com",
        found: data.domain || "empty",
        status: "error",
        message: "Invalid domain format",
        checkedAt,
      });
      return { ok: false, error: "Invalid domain format", checks } as const;
    }

    // Check TXT record _lovable-verify.<domain>
    const txt = await doh(`_lovable-verify.${domain}`, "TXT");
    const txtValues = txt.map((a) => a.data.replace(/"/g, "").trim());
    const tokenFound = txtValues.includes(data.token);
    checks.push({
      key: "txt-ownership",
      type: "TXT",
      host: `_lovable-verify.${domain}`,
      expected: data.token,
      found: txtValues.join(", ") || "none",
      status: tokenFound ? "success" : "error",
      message: tokenFound ? "TXT ownership record found" : "TXT ownership record is missing or does not match",
      checkedAt,
    });

    // Apex domains must have both apex and www pointed correctly so either URL works.
    const targets = requiredARecordHosts(domain);
    const aErrors: string[] = [];
    for (const t of targets) {
      const a = await doh(t, "A");
      const seen = a.map((r) => r.data);
      if (!seen.includes(LOVABLE_IP)) {
        aErrors.push(`A record for ${t} must point to ${LOVABLE_IP}. Current: ${seen.join(", ") || "none"}`);
      }
      checks.push({
        key: `a-${t}`,
        type: "A",
        host: t,
        expected: LOVABLE_IP,
        found: seen.join(", ") || "none",
        status: seen.includes(LOVABLE_IP) ? "success" : "error",
        message: seen.includes(LOVABLE_IP) ? "A record points correctly" : "A record is missing or points elsewhere",
        checkedAt,
      });
    }
    const apexARecordIsMissing = aErrors.some((message) => message.startsWith(`A record for ${domain} `));
    if (apexARecordIsMissing) return { ok: false, error: aErrors.join(" "), checks } as const;

    // DNS can be correct before the hosting edge attaches the domain; keep HTTPS as an informational check.
    let siteStatus: "live" | "setting_up" | "dns_only" = "dns_only";
    let siteMessage = "DNS verified — site is being set up";
    try {
      const r = await fetch(`https://${domain}`, { method: "GET", redirect: "manual" });
      const httpsOk = r.status >= 200 && r.status < 400;
      let body = "";
      try { body = (await r.text()).slice(0, 4000); } catch { /* ignore */ }
      const cfMatch = body.match(/Error\s*(10\d{2}|5\d{2})/i);
      const cfCode = cfMatch?.[1];
      if (httpsOk && !cfCode) {
        siteStatus = "live";
        siteMessage = "Site opens successfully over HTTPS";
      } else if (cfCode === "1001" || /DNS resolution error/i.test(body)) {
        siteStatus = "setting_up";
        siteMessage = "DNS verified — Cloudflare is still resolving the host (Error 1001). This usually clears within a few minutes.";
      } else if (cfCode && /^5\d{2}$/.test(cfCode)) {
        siteStatus = "setting_up";
        siteMessage = `DNS verified — hosting edge returned Cloudflare Error ${cfCode}. Site is being set up.`;
      } else {
        siteStatus = "setting_up";
        siteMessage = `DNS verified — site is being set up (HTTP ${r.status}).`;
      }
      checks.push({
        key: "https-live",
        type: "HTTPS",
        host: domain,
        expected: "HTTP 200-399",
        found: cfCode ? `HTTP ${r.status} • Cloudflare ${cfCode}` : `HTTP ${r.status}`,
        status: siteStatus === "live" ? "success" : "warning",
        message: siteMessage,
        checkedAt,
      });
    } catch {
      siteStatus = "setting_up";
      siteMessage = "DNS verified — waiting for the hosting edge to attach this domain.";
      checks.push({
        key: "https-live",
        type: "HTTPS",
        host: domain,
        expected: "Reachable HTTPS site",
        found: "not reachable",
        status: "warning",
        message: siteMessage,
        checkedAt,
      });
    }

    const missingRequiredRecords = aErrors.filter((message) => message.startsWith(`A record for ${domain} `));
    if (missingRequiredRecords.length) return { ok: false, error: missingRequiredRecords.join(" "), checks } as const;
    if (!tokenFound) {
      return {
        ok: false,
        error: `TXT record _lovable-verify.${domain} not found or doesn't match token. DNS changes can take up to 1 hour to propagate.`,
        checks,
      } as const;
    }

    return { ok: true, canonicalDomain: domain, checks, siteStatus, siteMessage } as const;
  });