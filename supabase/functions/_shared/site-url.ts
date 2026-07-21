/** Return the configured site URL for the project.
 *  Priority:
 *    1. SITE_URL environment variable
 *    2. app_secrets table entry named "site_url"
 *    3. Fallback for the existing managed project
 */
export async function getSiteUrl(supabase?: any): Promise<string> {
  const envUrl = Deno.env.get("SITE_URL");
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (supabase) {
    try {
      const { data } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("name", "site_url")
        .eq("is_active", true)
        .maybeSingle();
      if (data?.value) return String(data.value).replace(/\/$/, "");
    } catch (_) {
      // ignore
    }
  }

  return "https://boialo.lovable.app";
}
