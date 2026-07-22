# Self-Hosted Media Library (cPanel)

লক্ষ্য: সব image ও PDF cPanel-এ upload হবে, Supabase-এ শুধু ছোট index থাকবে। এক জায়গায় বাল্ক আপলোড → সব product/banner/ebook/page থেকে ওই library থেকে select করলেই URL DB-তে যাবে।

---

## Architecture

```
cPanel (public_html/uploads/)          Supabase (minimal)
├── products/2026/07/uuid.jpg          media_library table:
├── ebooks/2026/07/uuid.pdf            - id, url, thumbnail_url
├── banners/...                        - filename, mime, size
├── blog/...                           - folder, uploaded_by
└── api/                               - created_at
    ├── upload.php    (token+auth)     
    ├── delete.php    (token+auth)     Product row saves:
    └── config.php    (secret)         image_urls: [url1, url2]  (as now)
```

- cPanel-এ ফাইল, Supabase-এ শুধু metadata index (~200 bytes/file)
- Existing Supabase Storage URLs untouched — gradually migrate

---

## Security (best practice)

1. **HMAC-signed upload token** — frontend Supabase Edge Function থেকে 5-min expiring signed token পায়, PHP script token verify করে (shared secret + timestamp + HMAC-SHA256)। কেউ direct upload করতে পারবে না।
2. **Admin-only** — Edge Function `is_admin()` check করে তারপর token issue করে
3. **Server-side validation** (PHP): MIME sniff, extension whitelist (jpg/png/webp/gif/pdf), max size (image 5MB, pdf 100MB), random UUID filename, EXIF strip
4. **.htaccess hardening** in `/uploads/`: `Options -ExecCGI -Indexes`, `.php`/`.phtml` execution blocked → uploaded file কখনো execute হবে না
5. **CORS**: শুধু আপনার domain-এ allow

---

## Deliverables

### A. cPanel side (আপনি upload করবেন — আমি file তৈরি করে দেব)

- `cpanel/api/upload.php` — multipart upload, HMAC verify, UUID rename, folder routing, thumbnail generate (GD)
- `cpanel/api/delete.php` — HMAC-verified delete
- `cpanel/api/config.php.example` — `MEDIA_HMAC_SECRET` placeholder
- `cpanel/uploads/.htaccess` — execution block, hotlink allow-list
- `cpanel/README.md` — cPanel setup steps

### B. Supabase side

- Migration: `media_library` table (RLS: admin CRUD, public SELECT) + `GRANT`s
- Edge function `media-sign-upload` — verifies admin, returns `{uploadUrl, token, expires, path}`
- Edge function `media-sign-delete` — same for deletion

### C. Frontend

- `src/lib/mediaClient.ts` — upload/delete helpers, calls edge function then PHP
- `src/components/admin/MediaLibraryModal.tsx` — grid view, bulk upload (drag+drop, multi-file), search, folder filter, single/multi select, delete, pagination
- `src/components/admin/MediaPickerButton.tsx` — reusable button that opens the modal, returns selected URL(s)
- Integrations (replace existing uploaders):
  - `ProductImageUpload.tsx` — books
  - Universal product image field
  - Ebook cover + PDF upload
  - `SectionImageUpload.tsx` — banners, pages, blog, branding
- New admin page: `/admin/media` — full library management
- Menu entry under Admin sidebar

### D. Config

- `.env` (frontend): `VITE_MEDIA_BASE_URL=https://boialo.com/uploads`
- Edge function secret: `MEDIA_HMAC_SECRET` (via `add_secret`, same value goes into cPanel `config.php`)
- Fallback: যদি `VITE_MEDIA_BASE_URL` না থাকে, existing Supabase Storage flow use হবে (no breakage)

---

## Technical notes

- **Signed URL flow**: Frontend → Edge Function (`media-sign-upload`) → returns `{ token, folder, filename }` → Frontend POSTs file to `https://boialo.com/uploads/api/upload.php` with token in header → PHP verifies HMAC + timestamp → saves → returns `{ url, thumbnail_url }` → Frontend inserts row into `media_library` via Supabase → picker shows it
- **DB minimization**: `media_library` optional — picker can also work purely on cPanel listing endpoint if you want zero DB usage (I'll add a `list.php` for that mode)
- **Backward compat**: existing `product-images` bucket URLs keep rendering; Media Library shows both cPanel files and imported Supabase URLs in one grid
- **File organization on cPanel**: `/uploads/{folder}/{YYYY}/{MM}/{uuid}.{ext}` — easy backup, no folder blowup

---

## User action required

1. cPanel-এ `public_html/uploads/api/` folder-এ আমার তৈরি PHP files upload করবেন
2. `config.php`-তে একটা strong secret বসাবেন (একই secret Lovable secrets-এ save হবে)
3. `.env`-এ আপনার domain বসাবেন
4. Test upload → done

Approve করলে সব code লিখে দিচ্ছি। শুরু করব?
