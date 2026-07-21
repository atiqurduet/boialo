// Unified AI chat completion helper.
// Auto-fallback order:
//   1. LOVABLE_API_KEY  → Lovable AI Gateway (hosted mode)
//   2. OPENAI_API_KEY   → OpenAI API           (self-hosted)
//   3. GEMINI_API_KEY   → Google Gemini (OpenAI-compatible endpoint)
// Keys can come from Deno env OR the `app_secrets` DB table
// (managed via Admin Panel → Environment Variables).

import { createClient } from "npm:@supabase/supabase-js@2";

type Provider = "lovable" | "openai" | "gemini";

interface Resolved {
  provider: Provider;
  apiKey: string;
  endpoint: string;
  model: string;
}

let cache: { at: number; keys: Record<string, string> } | null = null;

async function loadDbSecrets(): Promise<Record<string, string>> {
  // 60s cache to avoid a DB round-trip on every call
  if (cache && Date.now() - cache.at < 60_000) return cache.keys;
  const url = Deno.env.get("SUPABASE_URL");
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return {};
  try {
    const sb = createClient(url, svc);
    const { data } = await sb
      .from("app_secrets")
      .select("name, value")
      .eq("is_active", true)
      .in("name", ["LOVABLE_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY"]);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) map[r.name] = r.value; });
    cache = { at: Date.now(), keys: map };
    return map;
  } catch (_) {
    return {};
  }
}

async function getKey(name: string): Promise<string | undefined> {
  return Deno.env.get(name) || (await loadDbSecrets())[name];
}

// Translate a "google/gemini-*" model id to the native id for the fallback provider.
function mapModel(model: string, provider: Provider): string {
  if (provider === "lovable") return model;
  const bare = model.replace(/^google\//, "").replace(/^openai\//, "");
  if (provider === "gemini") {
    // Map preview / non-existent ids to a stable Gemini model
    if (bare.includes("gemini")) {
      if (bare.includes("flash-preview") || bare.includes("3-flash")) return "gemini-2.5-flash";
      return bare; // e.g. gemini-2.5-flash, gemini-2.5-pro
    }
    return "gemini-2.5-flash";
  }
  // openai
  if (bare.startsWith("gpt-")) return bare;
  // Map Gemini → cheapest OpenAI equivalent
  if (bare.includes("flash")) return "gpt-4o-mini";
  return "gpt-4o";
}

async function resolveProvider(model: string): Promise<Resolved> {
  const lovable = await getKey("LOVABLE_API_KEY");
  if (lovable) {
    return {
      provider: "lovable",
      apiKey: lovable,
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: mapModel(model, "lovable"),
    };
  }
  const openai = await getKey("OPENAI_API_KEY");
  if (openai) {
    return {
      provider: "openai",
      apiKey: openai,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: mapModel(model, "openai"),
    };
  }
  const gemini = await getKey("GEMINI_API_KEY");
  if (gemini) {
    return {
      provider: "gemini",
      apiKey: gemini,
      // Gemini's OpenAI-compatible endpoint
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: mapModel(model, "gemini"),
    };
  }
  throw new Error(
    "No AI provider key configured. Set LOVABLE_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY (env or Admin → Environment Variables)."
  );
}

export interface ChatCompletionOptions {
  model: string;
  messages: any[];
  stream?: boolean;
  temperature?: number;
  response_format?: any;
  max_tokens?: number;
}

/** Call chat completion against whichever provider is configured. Returns the raw fetch Response. */
export async function aiChatCompletion(opts: ChatCompletionOptions): Promise<Response> {
  const r = await resolveProvider(opts.model);
  const body: any = { ...opts, model: r.model };
  return fetch(r.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${r.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** True if at least one supported AI key is configured. */
export async function hasAiProvider(): Promise<boolean> {
  try { await resolveProvider("google/gemini-2.5-flash"); return true; }
  catch { return false; }
}