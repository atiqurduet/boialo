# Boialo Media Library — cPanel Setup

এই folder-এর ফাইল গুলো আপনার cPanel hosting-এ upload করুন। Frontend থেকে সব image/PDF এখানে upload হবে, Supabase database-এ শুধু URL সেভ থাকবে।

## Folder structure

cPanel `public_html/` ভিতরে এভাবে upload করুন:

```
public_html/
└── uploads/
    ├── .htaccess          <- cpanel/uploads/.htaccess থেকে
    └── api/
        ├── config.php     <- config.php.example থেকে rename করে secret বসান
        ├── upload.php
        ├── delete.php
        └── list.php       (optional)
```

## Steps

### 1. Folder তৈরি

cPanel File Manager → `public_html` → New Folder → `uploads`, তারপর ভিতরে আরেকটা `api`।

### 2. File upload

`cpanel/api/*.php` — এই ফাইল গুলো `public_html/uploads/api/` তে upload করুন।
`cpanel/uploads/.htaccess` — এটা `public_html/uploads/.htaccess` তে upload করুন।

### 3. Secret setup

- `config.php.example` কে rename করুন `config.php`
- ভিতরে `MEDIA_HMAC_SECRET` এ একটা strong random string বসান (কমপক্ষে 32 character)
- একই string আপনার Lovable/Supabase Edge Function secret-এ `MEDIA_HMAC_SECRET` নামে save করুন

Random string generate করতে terminal-এ:
```bash
openssl rand -hex 32
```

### 4. Permission

cPanel File Manager-এ:
- `uploads/` folder → permission `755`
- `uploads/api/*.php` → permission `644`
- `config.php` → permission `600` (আপনার user শুধু পড়তে পারবে)

### 5. Test

Browser-এ যান: `https://your-domain.com/uploads/api/upload.php`

দেখাবে: `{"error":"Method not allowed"}` — এর মানে script ঠিকঠাক install হয়েছে।

### 6. Frontend config

Admin panel-এ যান: **Settings → Site Settings → Media** → `media_base_url` = `https://your-domain.com/uploads` বসান।

অথবা `site_settings` table-এ direct insert করুন:
```sql
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('media_base_url', '"https://your-domain.com/uploads"');
```

## Security notes

- `.htaccess` uploads folder-এ PHP execution block করে — কেউ malicious file upload করে execute করতে পারবে না
- সব upload HMAC token verified (5 minute expiry)
- শুধু whitelist extension (jpg/png/webp/gif/pdf) allowed
- Max size: image 5 MB, PDF 100 MB
- Filename UUID-এ rename হয় — original filename metadata-তে থাকে
