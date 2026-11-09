import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, signature: string, appSecret: string): Promise<boolean> {
  if (!signature.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = "sha256=" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return equalConstantTime(expected, signature.toLowerCase());
}

const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 4 };

Deno.serve(async (req: Request) => {
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (req.method === "GET") {
    if (!verifyToken) return new Response("Webhook is not configured", { status: 503 });
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && equalConstantTime(token, verifyToken) && challenge) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!appSecret || !supabaseUrl || !serviceKey) return json({ error: "Webhook configuration is incomplete" }, 503);

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!(await verifySignature(rawBody, signature, appSecret))) return json({ error: "Invalid signature" }, 401);

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON" }, 400); }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let processed = 0;

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (typeof phoneNumberId !== "string") continue;
      const { data: setting } = await admin.from("whatsapp_settings")
        .select("organization_id").eq("phone_number_id", phoneNumberId).maybeSingle();
      if (!setting?.organization_id) continue;

      for (const status of value?.statuses ?? []) {
        const providerId = status?.id;
        const providerStatus = status?.status;
        const timestamp = Number(status?.timestamp);
        if (typeof providerId !== "string" || !["sent", "delivered", "read", "failed"].includes(providerStatus)) continue;

        const { data: message } = await admin.from("whatsapp_messages")
          .select("id,delivery_status").eq("organization_id", setting.organization_id)
          .eq("provider_message_id", providerId).maybeSingle();
        if (!message) continue;

        const eventKey = `${providerId}:${providerStatus}:${Number.isFinite(timestamp) ? timestamp : "na"}`;
        const eventTime = Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
        const safeErrors = (status?.errors ?? []).slice(0, 3).map((e: any) => ({
          code: String(e?.code ?? "").slice(0, 40),
          title: String(e?.title ?? "").slice(0, 120),
        }));
        const { error: eventError } = await admin.from("whatsapp_message_events").insert({
          organization_id: setting.organization_id,
          message_id: message.id,
          event_key: eventKey,
          event_type: providerStatus,
          provider_message_id: providerId,
          provider_status: providerStatus,
          provider_timestamp: eventTime,
          sanitized_payload: safeErrors.length ? { errors: safeErrors } : {},
        });
        if (eventError && eventError.code !== "23505") console.error("Webhook event insert failed", eventError.code);

        const currentRank = rank[message.delivery_status] ?? 0;
        const incomingRank = rank[providerStatus] ?? 0;
        if (providerStatus === "failed" ? currentRank < 2 : incomingRank > currentRank) {
          const patch: Record<string, unknown> = { delivery_status: providerStatus };
          if (providerStatus === "delivered") patch.delivered_at = eventTime;
          if (providerStatus === "read") patch.read_at = eventTime;
          if (providerStatus === "failed") {
            patch.failed_at = eventTime;
            patch.error_code = safeErrors[0]?.code ?? "PROVIDER_DELIVERY_FAILED";
            patch.error_message = safeErrors[0]?.title ?? "WhatsApp delivery failed";
          }
          await admin.from("whatsapp_messages").update(patch).eq("id", message.id);
        }
        processed++;
      }
    }
  }

  return json({ received: true, processed });
});
