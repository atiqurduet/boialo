# Boialo — Self-Hosting Guide

এই ফাইল আপনাকে Lovable Cloud ছেড়ে **যেকোনো Supabase project + যেকোনো hosting** (cPanel, Vercel, VPS) এ deploy করতে সাহায্য করবে।

---

## ১. Supabase Project তৈরি

1. https://supabase.com এ নতুন project তৈরি করুন
2. Settings → API থেকে কপি করুন:
   - `Project URL` (e.g. `https://xxxx.supabase.co`)
   - `anon / publishable key`
   - `service_role key` (server-only, কখনো frontend এ দেবেন না)
   - `Project ref` (URL এর `xxxx` অংশ)

## ২. Database Restore

Terminal এ:

```bash
# Custom format backup (.backup) হলে
pg_restore --no-owner --no-acl --clean \
  -d "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
  boialo_260716.backup

# Plain SQL dump হলে
psql "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
  < boialo_database_20260703_215646.sql
```

## ৩. Storage Buckets

Supabase Dashboard → Storage → নিচের bucket গুলো তৈরি করুন:

| Bucket | Public |
|--------|--------|
| product-images | ✅ |
| product-previews | ✅ |
| branding | ✅ |
| chat-attachments | ✅ |
| avatars | ✅ |
| social-media | ✅ |
| digital-files | ❌ |

`boialo_storage_export.zip` থেকে files upload করুন।

## ৪. Google OAuth Login

**a) Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- Create Credentials → OAuth Client ID → Web application
- **Authorized redirect URIs** এ যোগ করুন:
  ```
  https://<your-ref>.supabase.co/auth/v1/callback
  ```
- Client ID + Secret কপি করুন

**b) Supabase Dashboard:**
- Authentication → Providers → Google → Enable
- Client ID + Secret paste করে save

**c) URL Configuration:**
- Site URL: `https://boialo.com` (আপনার domain)
- Redirect URLs: `https://boialo.com/**`, `http://localhost:8080/**`

> ℹ️ Frontend কোড ইতোমধ্যে native Supabase OAuth ব্যবহার করে — কোনো code change লাগবে না।

## ৫. Edge Functions Deploy

```bash
npm install -g supabase
supabase login
cd boialo_project_source
supabase link --project-ref <your-ref>
supabase functions deploy
```

## ৬. Secrets Configure

### উপায় ১: CLI
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxx
supabase secrets set TWILIO_PHONE_NUMBER=+8801xxxxxxxxx
supabase secrets set OPENAI_API_KEY=sk-xxxx      # optional
supabase secrets set GEMINI_API_KEY=AIzaxxxx     # optional
```

### উপায় ২: Admin Panel
Site login → `/admin/env-variables` → key/value যোগ করুন।

### Self-hosting এর জন্য এই গুলো অবশ্যই যোগ করুন
```
SUPABASE_FUNCTIONS_URL = https://<your-ref>.supabase.co/functions/v1
SUPABASE_ANON_KEY      = <your anon/publishable key>
SITE_URL               = https://your-domain.com
```
- `SUPABASE_FUNCTIONS_URL` + `SUPABASE_ANON_KEY` → `notify_new_product` trigger এর জন্য
- `SITE_URL` → invoice QR code, tracking link, Facebook/TikTok CAPI, WhatsApp/Facebook webhook fallback URL এর জন্য

> ⚠️ `LOVABLE_API_KEY` self-hosting এ কাজ করবে না। AI features চাইলে `OPENAI_API_KEY` বা `GEMINI_API_KEY` set করুন। না দিলেও site স্বাভাবিকভাবে চলবে, শুধু AI features (chat bot, image search, keyword research, audience AI) off থাকবে।

## ৭. Frontend Build & Upload

`.env`:
```env
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon key>
VITE_SUPABASE_PROJECT_ID=<your-ref>
```

Build:
```bash
npm install
npm run build
```

`dist/` folder এর সব file আপনার hosting এ upload করুন।

### cPanel SPA routing (`.htaccess`):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## ৮. User Passwords

`users_with_temp_passwords.csv` থেকে temp password দিয়ে users login করবে।
অথবা Supabase → Authentication → Users → Send Password Reset।

## ৯. Troubleshooting

| সমস্যা | সমাধান |
|--------|--------|
| Google login "Unsupported provider" | Supabase Dashboard এ Google provider enable করেননি |
| Google login redirect ভুল | Site URL / Redirect URLs ঠিক করুন |
| Edge function 500 | `supabase functions logs <name>` চেক করুন |
| AI chat কাজ করে না | `OPENAI_API_KEY` বা `GEMINI_API_KEY` set করুন |
| Refresh এ 404 | `.htaccess` (cPanel) বা SPA fallback config |
| Product notification আসছে না | `SUPABASE_FUNCTIONS_URL` + `SUPABASE_ANON_KEY` app_secrets এ set |

---

## যা এই প্রোজেক্ট থেকে সরানো হয়েছে

- ❌ `@lovable.dev/cloud-auth-js` dependency (Google login এখন native Supabase)
- ❌ DB trigger এর hardcoded project ref (app_secrets থেকে পড়ে)
- ❌ AI functions এর LOVABLE_API_KEY hard dependency (OpenAI/Gemini fallback ইতোমধ্যে আছে)

সব features পূর্বের মতোই কাজ করবে, শুধু hosting-agnostic হয়েছে।
