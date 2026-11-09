import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publicKey || !serviceKey) return json({ error: "Server configuration is incomplete" }, 503);

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return json({ error: "Authentication required" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const organizationId = body?.organization_id;
  const accessToken = body?.access_token;
  if (typeof organizationId !== "string" || !/^[0-9a-f-]{36}$/i.test(organizationId)) {
    return json({ error: "Invalid organization ID" }, 400);
  }
  if (typeof accessToken !== "string" || accessToken.trim().length < 30 || accessToken.length > 4096) {
    return json({ error: "Invalid WhatsApp access token" }, 400);
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userResult, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !userResult.user) return json({ error: "Invalid or expired session" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("role,membership_status")
    .eq("organization_id", organizationId)
    .eq("user_id", userResult.user.id)
    .eq("membership_status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (membershipError || !membership) return json({ error: "Only an active organization owner or admin can configure credentials" }, 403);

  const { error: saveError } = await admin.rpc("whatsapp_set_access_token", {
    p_organization_id: organizationId,
    p_access_token: accessToken,
  });
  if (saveError) {
    console.error("Credential vault write failed", saveError.code ?? "unknown");
    return json({ error: "Unable to securely store WhatsApp credentials" }, 500);
  }

  return json({ saved: true });
});
