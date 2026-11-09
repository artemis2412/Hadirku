import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type ClaimedJob = {
  message: {
    id: string;
    organization_id: string;
    recipient_phone: string;
    recipient_type: "self" | "guardian";
    template_name_snapshot: string;
    language_code: string;
    template_variables: Record<string, unknown>;
    attempts: number;
  };
  phone_number_id: string;
  access_token: string;
  provider_template_name: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const graphVersion = Deno.env.get("META_GRAPH_API_VERSION");
  if (!supabaseUrl || !serviceKey || !graphVersion || !/^v[0-9]+\.[0-9]+$/.test(graphVersion)) {
    return json({ error: "Worker configuration is incomplete" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("whatsapp_claim_batch", { p_limit: 10 });
  if (error) {
    console.error("Queue claim failed", error.code ?? "unknown");
    return json({ error: "Unable to claim queue" }, 500);
  }

  const jobs = (Array.isArray(data) ? data : []) as ClaimedJob[];
  const result = { claimed: jobs.length, sent: 0, retried: 0, failed: 0, skipped: 0 };

  for (const job of jobs) {
    const msg = job.message;
    try {
      // Re-check opt-in immediately before contacting Meta, not only at queue time.
      const { data: consent, error: consentError } = await admin
        .from("whatsapp_consents")
        .select("id")
        .eq("organization_id", msg.organization_id)
        .eq("person_id", msg.id ? (await admin.from("whatsapp_messages").select("person_id").eq("id", msg.id).single()).data?.person_id : null)
        .eq("recipient_type", msg.recipient_type)
        .eq("phone_number", msg.recipient_phone)
        .eq("consent_status", "opted_in")
        .is("revoked_at", null)
        .not("consented_at", "is", null)
        .maybeSingle();

      if (consentError || !consent) {
        await admin.from("whatsapp_messages").update({
          delivery_status: "cancelled",
          error_code: "CONSENT_NOT_ACTIVE",
          error_message: "Recipient consent is no longer active",
        }).eq("id", msg.id).eq("delivery_status", "sending");
        result.skipped++;
        continue;
      }

      const variables = msg.template_variables ?? {};
      const keys = Object.keys(variables).sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (Number.isInteger(na) && Number.isInteger(nb)) return na - nb;
        return a.localeCompare(b);
      });
      const parameters = keys.map((key) => ({
        type: "text",
        text: String(variables[key] ?? ""),
      }));
      const components = parameters.length ? [{ type: "body", parameters }] : [];

      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${job.phone_number_id}/messages`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${job.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: msg.recipient_phone.replace(/^\+/, ""),
          type: "template",
          template: {
            name: job.provider_template_name,
            language: { code: msg.language_code },
            ...(components.length ? { components } : {}),
          },
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const providerError = body?.error ?? {};
        const retryable = response.status === 429 || response.status >= 500;
        const canRetry = retryable && msg.attempts < 5;
        const delayMinutes = Math.min(60, 2 ** Math.max(1, msg.attempts));
        await admin.from("whatsapp_messages").update({
          delivery_status: canRetry ? "queued" : "failed",
          scheduled_at: canRetry ? new Date(Date.now() + delayMinutes * 60_000).toISOString() : undefined,
          failed_at: canRetry ? null : new Date().toISOString(),
          error_code: String(providerError.code ?? response.status).slice(0, 80),
          error_message: String(providerError.message ?? "WhatsApp provider rejected the message").slice(0, 500),
        }).eq("id", msg.id).eq("delivery_status", "sending");
        if (canRetry) result.retried++; else result.failed++;
        continue;
      }

      const providerId = body?.messages?.[0]?.id;
      if (typeof providerId !== "string" || !providerId) {
        await admin.from("whatsapp_messages").update({
          delivery_status: "failed",
          failed_at: new Date().toISOString(),
          error_code: "PROVIDER_RESPONSE_INVALID",
          error_message: "Provider response did not include a message ID",
        }).eq("id", msg.id).eq("delivery_status", "sending");
        result.failed++;
        continue;
      }

      const sentAt = new Date().toISOString();
      const { error: updateError } = await admin.from("whatsapp_messages").update({
        delivery_status: "sent",
        provider_message_id: providerId,
        sent_at: sentAt,
        error_code: null,
        error_message: null,
      }).eq("id", msg.id).eq("delivery_status", "sending");
      if (updateError) {
        console.error("Message status update failed", updateError.code ?? "unknown");
        result.failed++;
        continue;
      }
      await admin.from("whatsapp_message_events").insert({
        organization_id: msg.organization_id,
        message_id: msg.id,
        event_key: `sent:${msg.id}`,
        event_type: "sent",
        provider_message_id: providerId,
        provider_status: "accepted",
        provider_timestamp: sentAt,
        sanitized_payload: { provider: "meta_cloud_api" },
      });
      result.sent++;
    } catch (error) {
      // Network failures have an ambiguous provider outcome; do not blindly retry and risk duplicate delivery.
      await admin.from("whatsapp_messages").update({
        delivery_status: "failed",
        failed_at: new Date().toISOString(),
        error_code: "WORKER_NETWORK_ERROR",
        error_message: error instanceof Error ? error.message.slice(0, 400) : "Unknown worker error",
      }).eq("id", msg.id).eq("delivery_status", "sending");
      result.failed++;
    }
  }

  return json(result);
});
