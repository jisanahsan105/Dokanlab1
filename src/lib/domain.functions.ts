import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResp = { Status: number; Answer?: DohAnswer[] };
type CheckStatus = "success" | "warning" | "error";
type DomainCheck = {
  key: string;
  type: "TXT" | "A" | "CNAME" | "HTTPS" | "DOMAIN";
  host: string;
  expected: string;
  found: string;
  status: CheckStatus;
  message: string;
  checkedAt: string;
};

const VERCEL_IP = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

function isSubdomain(domain: string): boolean {
  const parts = domain.split(".");

  if (parts.length <= 2) return false;

  const commonSecondLevel = ["co", "com", "org", "net", "gov", "edu"];
  const tld = parts[parts.length - 1];
  const second = parts[parts.length - 2];

  if (commonSecondLevel.includes(second) && tld.length === 2) {
    return false;
  }

  return true;
}

function getDnsRecordsToCheck(domain: string) {
  return {
    root: domain,
    www: isSubdomain(domain) ? null : `www.${domain}`,
  };
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

async function doh(name: string, type: "A" | "TXT"): Promise<DohAnswer[]> {
  const r = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      name
    )}&type=${type}`,
    { headers: { Accept: "application/dns-json" }, cache: "no-store" }
  );
  if (!r.ok) return [];
  const j = (await r.json()) as DohResp;
  return j.Answer ?? [];
}

// 👇 এইখানে বসবে
async function dohCname(name: string): Promise<DohAnswer[]> {
  const r = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      name
    )}&type=CNAME`,
    {
      headers: {
        Accept: "application/dns-json",
      },
      cache: "no-store",
    }
  );
  if (!r.ok) return [];
  const j = (await r.json()) as DohResp;
  return j.Answer ?? [];
}

export const verifyDomainDns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { domain: string; token: string }) => d)
  .handler(async ({ data, context }) => {
  try {
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

    // Ownership check: caller must own a store whose custom_domain matches, and
    // the stored verification token for that store must match the one supplied.
    const { data: owned, error: ownErr } = await context.supabase
      .from("stores")
      .select("id, custom_domain, owner_id, store_domain_verifications(token)")
      .eq("owner_id", context.userId)
      .eq("custom_domain", domain)
      .maybeSingle();
    
console.log("SUPABASE:", { owned, ownErr });
    
    if (ownErr || !owned) {
      return {
        ok: false,
        error: "You can only verify a domain attached to a store you own.",
        checks: [
          {
            key: "ownership",
            type: "DOMAIN",
            host: domain,
            expected: "You own a store with this custom domain",
            found: "no matching store",
            status: "error",
            message: "Ownership check failed",
            checkedAt,
          },
        ],
      } as const;
    }

    const storedToken =
      (owned as any)?.store_domain_verifications?.token ??
      (Array.isArray((owned as any)?.store_domain_verifications)
        ? (owned as any).store_domain_verifications[0]?.token
        : null);

    if (!storedToken || storedToken !== data.token) {
      return {
        ok: false,
        error: "Verification token mismatch — reconnect the domain and try again.",
        checks: [
          {
            key: "ownership-token",
            type: "DOMAIN",
            host: domain,
            expected: "Matching stored verification token",
            found: "mismatch",
            status: "error",
            message: "Ownership token check failed",
            checkedAt,
          },
        ],
      } as const;
    }

    // Check TXT record _lovable-verify.<domain>
    const txt = await doh(`_lovable-verify.${domain}`, "TXT");
    const txtValues = txt.map((a) => a.data.replace(/"/g, "").trim());
    const tokenFound = txtValues.includes(data.token);
    console.log("TXT:", txtValues);
    checks.push({
      key: "txt-ownership",
      type: "TXT",
      host: `_lovable-verify.${domain}`,
      expected: data.token,
      found: txtValues.join(", ") || "none",
      status: tokenFound ? "success" : "error",
      message: tokenFound
        ? "TXT ownership record found"
        : "TXT ownership record is missing or does not match",
      checkedAt,
    });

    const records = getDnsRecordsToCheck(domain);
    const aErrors: string[] = [];

    // Root A Record
    const apex = await doh(records.root, "A");
const apexIPs = apex.map((r) => r.data);

console.log("A RECORD:", apexIPs);

    const rootOk = apexIPs.includes(VERCEL_IP);

    checks.push({
      key: "a-root",
      type: "A",
      host: records.root,
      expected: VERCEL_IP,
      found: apexIPs.join(", ") || "none",
      status: rootOk ? "success" : "error",
      message: rootOk ? "Root A Record OK" : "Root A Record Missing",
      checkedAt,
    });

    if (!rootOk) {
      aErrors.push(`A record for ${records.root} must point to ${VERCEL_IP}`);
    }

    // WWW CNAME (only apex domain)
    if (records.www) {
      const cname = await dohCname(records.www);

      const cnameTargets = cname.map((r) =>
        r.data.replace(/\.$/, "").toLowerCase()
      );

      const cnameOk = cnameTargets.includes(VERCEL_CNAME.toLowerCase());

      checks.push({
        key: "cname-www",
        type: "CNAME",
        host: records.www,
        expected: VERCEL_CNAME,
        found: cnameTargets.join(", ") || "none",
        status: cnameOk ? "success" : "error",
        message: cnameOk ? "WWW CNAME OK" : "WWW CNAME Missing",
        checkedAt,
      });

      if (!cnameOk) {
        aErrors.push(
          `CNAME for ${records.www} must point to ${VERCEL_CNAME}`
        );
      }
    }

    if (aErrors.length) {
      return {
        ok: false,
        error: aErrors.join(" "),
        checks,
      } as const;
    }

    // DNS can be correct before the hosting edge attaches the domain; keep HTTPS as an informational check.
    let siteStatus: "live" | "setting_up" | "dns_only" = "dns_only";
    let siteMessage = "DNS verified — site is being set up";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const r = await fetch(`https://${domain}`, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const httpsOk = r.status >= 200 && r.status < 400;
      let body = "";
      try {
        body = (await r.text()).slice(0, 4000);
      } catch {
        /* ignore */
      }
      const cfMatch = body.match(/Error\s*(10\d{2}|5\d{2})/i);
      const cfCode = cfMatch?.[1];
      const isVercelError =
        body.includes("DEPLOYMENT_NOT_FOUND") ||
        body.includes("DOMAIN_NOT_CONFIGURED") ||
        body.includes("Configuration Error");

      if (httpsOk && !cfCode && !isVercelError) {
        siteStatus = "live";
        siteMessage = "Site opens successfully over HTTPS";
      } else if (isVercelError) {
        siteStatus = "setting_up";
        siteMessage =
          "DNS verified — Vercel is configuring your domain. This usually takes a few minutes.";
      } else if (cfCode === "1001" || /DNS resolution error/i.test(body)) {
        siteStatus = "setting_up";
        siteMessage =
          "DNS verified — Cloudflare is still resolving the host (Error 1001). This usually clears within a few minutes.";
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
        found: cfCode
          ? `HTTP ${r.status} • Cloudflare ${cfCode}`
          : `HTTP ${r.status}`,
        status: siteStatus === "live" ? "success" : "warning",
        message: siteMessage,
        checkedAt,
      });
    } catch (err) {
  clearTimeout(timeout);

  if (err instanceof Error && err.name === "AbortError") {
    siteStatus = "setting_up";
    siteMessage =
      "DNS verified — the site is taking longer than expected to respond. Please wait a few minutes and try again.";
  } else {
    siteStatus = "setting_up";
    siteMessage =
      "DNS verified — waiting for the hosting edge to attach this domain.";
  }
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

    if (!tokenFound) {
      return {
        ok: false,
        error: `TXT record _lovable-verify.${domain} not found or doesn't match token. DNS changes can take up to 1 hour to propagate.`,
        checks,
      } as const;
    }
// ===============================
// Add domain to Vercel project
// ===============================

const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID!;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN!;

if (!VERCEL_PROJECT_ID || !VERCEL_API_TOKEN) {
  return {
    ok: false,
    error: "Missing Vercel environment variables.",
    checks,
  } as const;
}

const addDomainRes = await fetch(
  `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: domain,
    }),
  }
);

const addDomainBody = await addDomainRes.json();

console.log("STATUS:", addDomainRes.status);
console.log("VERCEL ADD DOMAIN:", addDomainBody);

if (!addDomainRes.ok && addDomainRes.status !== 409) {
  return {
    ok: false,
    error:
      addDomainBody.error?.message ||
      addDomainBody.message ||
      "Failed to add domain to Vercel.",
    checks,
  } as const;
}

// ===============================
// Trigger domain verification
// ===============================

const verifyRes = await fetch(
  `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
);

const verifyBody = await verifyRes.json();

console.log("VERCEL VERIFY:", verifyBody);

// Ignore if already verified
if (!verifyRes.ok && verifyRes.status !== 409) {
  console.warn("Vercel verify warning:", verifyBody);
}
    return { ok: true, canonicalDomain: domain, checks, siteStatus, siteMessage } as const;
  } catch (err) {
    console.error("verifyDomainDns ERROR:", err);

    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      checks: [],
    } as const;
  }
});
