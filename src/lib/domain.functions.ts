import { createServerFn } from "@tanstack/react-start";

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResp = { Status: number; Answer?: DohAnswer[] };

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
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return { ok: false, error: "Invalid domain format" } as const;
    }

    // Check TXT record _lovable-verify.<domain>
    const txt = await doh(`_lovable-verify.${domain}`, "TXT");
    const tokenFound = txt.some((a) => a.data.replace(/"/g, "").trim() === data.token);
    if (!tokenFound) {
      return {
        ok: false,
        error: `TXT record _lovable-verify.${domain} not found or doesn't match token. DNS changes can take up to 1 hour to propagate.`,
      } as const;
    }

    // Apex domains must have both apex and www pointed correctly so either URL works.
    const targets = requiredARecordHosts(domain);
    for (const t of targets) {
      const a = await doh(t, "A");
      const seen = a.map((r) => r.data);
      if (!seen.includes(LOVABLE_IP)) {
        return {
          ok: false,
          error: `A record for ${t} must point to ${LOVABLE_IP}. Current: ${seen.join(", ") || "none"}`,
        } as const;
      }
    }

    // DNS can be correct before the hosting edge is ready; avoid showing a broken live link.
    try {
      const r = await fetch(`http://${domain}`, { method: "GET", redirect: "manual" });
      if (r.status < 200 || r.status >= 400) {
        return {
          ok: false,
          error: `DNS records are found, but ${domain} is not live yet. Retry in a few minutes after hosting and SSL finish setting up. Current status: ${r.status}`,
        } as const;
      }
    } catch {
      return {
        ok: false,
        error: `DNS records are found, but ${domain} is not reachable yet. Retry in a few minutes after propagation finishes.`,
      } as const;
    }

    return { ok: true, canonicalDomain: domain } as const;
  });