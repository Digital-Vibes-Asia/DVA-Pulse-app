import crypto from "node:crypto";

/*
 * ElevenLabs post-call webhook receiver.
 *
 * ElevenLabs POSTs a `post_call_transcription` event here after every Aria
 * call ends. We verify the HMAC signature, then store the call record in
 * Supabase (`public.dvapulse_calls`). The console reads summaries from there.
 *
 * The anon key is a PUBLIC client key — RLS on dvapulse_calls only lets the
 * anon role INSERT (never read/update), and the HMAC check below is what
 * gates who can trigger that insert.
 */
const SUPABASE_URL = "https://glevzzgrpewhmlkaccoe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZXZ6emdycGV3aG1sa2FjY29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTE3MzIsImV4cCI6MjA5NjI2NzczMn0.G75sLhPCNygHjFcE9x7WhtoFa-t8DM5k2rlM1n-RxP8";

const SIGNATURE_TOLERANCE_SECS = 30 * 60;

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Header format: "t=<unix seconds>,v0=<hex hmac-sha256 of `${t}.${body}`>"
function verifySignature(header, rawBody, secret) {
  if (typeof header !== "string") return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const { t, v0 } = parts;
  if (!t || !v0) return false;

  const ageSecs = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(ageSecs) || ageSecs > SIGNATURE_TOLERANCE_SECS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const given = Buffer.from(v0, "utf8");
  const want = Buffer.from(expected, "utf8");
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("ELEVENLABS_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "server not configured" });
  }

  const rawBody = await readRawBody(req);
  if (!verifySignature(req.headers["elevenlabs-signature"], rawBody, secret)) {
    return res.status(401).json({ error: "invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "invalid JSON" });
  }

  // Other event types (e.g. post_call_audio) are acknowledged but not stored.
  if (event.type !== "post_call_transcription") {
    return res.status(200).json({ ok: true, ignored: event.type });
  }

  const data = event.data ?? {};
  if (!data.conversation_id) {
    return res.status(400).json({ error: "missing conversation_id" });
  }
  const vars = data.conversation_initiation_client_data?.dynamic_variables ?? {};

  const row = {
    conversation_id: data.conversation_id,
    agent_id: data.agent_id ?? null,
    lead_id: vars.lead_id != null ? String(vars.lead_id) : null,
    lead_name: vars.lead_name ?? null,
    call_status: data.status ?? null,
    duration_secs: data.metadata?.call_duration_secs ?? null,
    summary: data.analysis?.transcript_summary ?? null,
    transcript: data.transcript ?? null,
    payload: event,
  };

  // ignore-duplicates makes ElevenLabs retries of the same conversation a no-op.
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/dvapulse_calls?on_conflict=conversation_id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(row),
    }
  );

  if (!resp.ok) {
    console.error("supabase insert failed", resp.status, await resp.text());
    return res.status(500).json({ error: "storage failed" });
  }

  return res.status(200).json({ ok: true });
}
