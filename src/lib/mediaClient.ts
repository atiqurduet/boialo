import { supabase } from "@/integrations/supabase/client";

let cachedBaseUrl: string | null = null;

export async function getMediaBaseUrl(): Promise<string | null> {
  if (cachedBaseUrl !== null) return cachedBaseUrl || null;
  // 1. Build-time env
  const envUrl = (import.meta as any).env?.VITE_MEDIA_BASE_URL as string | undefined;
  if (envUrl) {
    cachedBaseUrl = envUrl.replace(/\/$/, "");
    return cachedBaseUrl;
  }
  // 2. site_settings row
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "media_base_url")
      .maybeSingle();
    const val = (data?.setting_value as any) as string | undefined;
    if (val && typeof val === "string") {
      cachedBaseUrl = val.replace(/\/$/, "");
      return cachedBaseUrl;
    }
  } catch (_) {}
  cachedBaseUrl = "";
  return null;
}

export interface UploadedMedia {
  id?: string;
  url: string;
  thumbnail_url: string | null;
  filename: string;
  original_filename: string;
  folder: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  storage_provider: string;
}

export async function uploadMediaFile(
  file: File,
  folder: string = "general",
  opts: { skipIndex?: boolean } = {},
): Promise<UploadedMedia> {
  const baseUrl = await getMediaBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "Media base URL configured নেই। Admin → Settings-এ media_base_url যোগ করুন।",
    );
  }

  // 1. Get signed token from edge function
  const { data: signData, error: signErr } = await supabase.functions.invoke(
    "media-sign-upload",
    { body: { action: "upload", folder, filename: file.name } },
  );
  if (signErr || !signData?.token) {
    throw new Error(signErr?.message || "Upload authorization failed");
  }

  // 2. Upload to cPanel
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${baseUrl}/api/upload.php`, {
    method: "POST",
    headers: {
      "X-Media-Folder": signData.folder,
      "X-Media-Filename": signData.filename,
      "X-Media-Timestamp": signData.timestamp,
      "X-Media-Token": signData.token,
    },
    body: fd,
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const result = (await res.json()) as Omit<UploadedMedia, "original_filename">;
  const uploaded: UploadedMedia = { ...result, original_filename: file.name };

  // 3. Index in media_library table
  if (!opts.skipIndex) {
    const { data: userData } = await supabase.auth.getUser();
    const { data: inserted } = await supabase
      .from("media_library")
      .insert({
        url: uploaded.url,
        thumbnail_url: uploaded.thumbnail_url,
        filename: uploaded.filename,
        original_filename: uploaded.original_filename,
        folder: uploaded.folder,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
        width: uploaded.width,
        height: uploaded.height,
        storage_provider: uploaded.storage_provider,
        uploaded_by: userData.user?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (inserted?.id) uploaded.id = inserted.id;
  }

  return uploaded;
}

export async function deleteMediaFile(
  entry: { id?: string; url: string; folder: string; filename: string },
): Promise<void> {
  const baseUrl = await getMediaBaseUrl();
  if (!baseUrl) throw new Error("Media base URL not configured");

  // Parse year/month from URL path
  const parts = entry.url.split("/");
  const filename = parts[parts.length - 1];
  const month = parts[parts.length - 2];
  const year = parts[parts.length - 3];
  const folder = parts[parts.length - 4] || entry.folder;

  const { data: signData, error: signErr } = await supabase.functions.invoke(
    "media-sign-upload",
    {
      body: { action: "delete", folder, filename, year, month },
    },
  );
  if (signErr || !signData?.token) {
    throw new Error(signErr?.message || "Delete authorization failed");
  }

  await fetch(`${baseUrl}/api/delete.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      filename,
      year,
      month,
      token: signData.token,
      timestamp: signData.timestamp,
    }),
  });

  if (entry.id) {
    await supabase.from("media_library").delete().eq("id", entry.id);
  }
}

export const MEDIA_FOLDERS = [
  { value: "products", label: "প্রোডাক্ট" },
  { value: "ebooks", label: "ই-বুক / PDF" },
  { value: "banners", label: "ব্যানার" },
  { value: "blog", label: "ব্লগ" },
  { value: "branding", label: "ব্র্যান্ডিং" },
  { value: "universal", label: "সাধারণ প্রোডাক্ট" },
  { value: "general", label: "সাধারণ" },
] as const;
