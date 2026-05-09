import { createServerFn } from "@tanstack/react-start";

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResp = { Status: number; Answer?: DohAnswer[] };

const LOVABLE_IP = "185.158.133.1";

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
    const domain = data.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
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

    // Check A record on the domain itself, OR on the apex if user provided www.
    const targets = domain.startsWith("www.") ? [domain, domain.slice(4)] : [domain];
    let lastSeen: string[] = [];
    let aOk = false;
    for (const t of targets) {
      const a = await doh(t, "A");
      lastSeen = a.map((r) => r.data);
      if (lastSeen.includes(LOVABLE_IP)) { aOk = true; break; }
    }
    if (!aOk) {
      return {
        ok: false,
        error: `A record for ${domain} must point to ${LOVABLE_IP}. Current: ${lastSeen.join(", ") || "none"}`,
      } as const;
    }

    return { ok: true } as const;
  });