
# Self-Hosting Compatibility Plan

লক্ষ্য: প্রোজেক্ট এমনভাবে refactor করব যাতে **যেকোনো standard Supabase project + যেকোনো hosting** (cPanel/Vercel/VPS) এ deploy করলেই কাজ করে। Lovable-specific dependency সরিয়ে দেব, AI-related coupling কমাব।

---

## Phase 1 — Auth (Google Login Fix) 🔴 Critical

**সমস্যা:** `@lovable.dev/cloud-auth-js` package Lovable OAuth broker (`oauth.lovable.app`) ব্যবহার করে। Self-hosting এ কাজ করবে না।

**পরিবর্তন যা আমি করব:**
- `src/pages/SignIn.tsx` এবং যেসব জায়গায় `lovable.auth.signInWithOAuth` আছে — সরাসরি `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })` এ replace করব।
- `src/integrations/lovable/index.ts` কে thin wrapper বানাব যা internally native Supabase call করে (backward compatible)।
- `AuthContext.tsx` এ Google callback handling ঠিক আছে কিনা verify করব।

**যা আপনাকে করতে হবে (self-hosting এ):**
- Google Cloud Console → OAuth Client তৈরি → Supabase callback URL যোগ করুন
- Supabase Dashboard → Authentication → Providers → Google enable + Client ID/Secret paste
- Site URL এবং Redirect URLs configure করুন

---

## Phase 2 — AI Dependency Reduction 🟡

**সমস্যা:** ৬টি Edge Function AI ব্যবহার করে, সব `LOVABLE_API_KEY` এর উপর নির্ভর।

**যা আমি করব:**
- ইতোমধ্যে `_shared/ai-gateway.ts` তৈরি করা আছে (OpenAI/Gemini fallback সাপোর্ট করে) — verify করব সবগুলো function সেটা ব্যবহার করছে।
- AI-optional করব: যদি কোনো AI key set না থাকে, functions gracefully fallback দেবে (e.g., image-search → keyword-based search, ai-chat → template response)।
- Admin panel এ AI status indicator যোগ করব — কোন provider active দেখাবে।

**AI dependency এভাবে কমবে:**
| Feature | আগে | পরে |
|---------|-----|-----|
| Chat bot | LOVABLE_API_KEY required | OpenAI/Gemini optional, fallback template |
| Image search | LOVABLE required | Gemini optional, fallback text search |
| Keyword research | LOVABLE required | OpenAI optional, hide feature if no key |
| Audience AI | LOVABLE required | Optional, hide if no key |

**যা আপনাকে করতে হবে:**
- OpenAI বা Gemini key নিন (optional — না দিলেও site কাজ করবে, শুধু AI features off থাকবে)
- Admin → Environment Variables থেকে key সেট করুন

---

## Phase 3 — Hardcoded Lovable References Cleanup 🟢

**যা আমি করব:**
- `.env` file এর `VITE_SUPABASE_URL` etc. self-hosting এ properly load হচ্ছে verify করব
- `supabase/functions/*/index.ts` এ hardcoded `nyzvjuzrkhdbuqlcxhzn.supabase.co` reference (যেমন `notify_new_product` trigger) কে environment-aware করব
- Anon key hardcoded থাকলে সেগুলো `SUPABASE_ANON_KEY` env থেকে পড়ব
- CORS headers verify — সব function এ properly set আছে কিনা

---

## Phase 4 — Documentation

**যা আমি করব:**
- Root এ `SELF_HOSTING.md` তৈরি করব:
  - Step-by-step Supabase setup
  - Google OAuth setup
  - Edge Function deployment
  - Secret configuration
  - Frontend build & upload to cPanel
  - Common troubleshooting

---

## Scope যা এই কাজে **নেই**

- Database schema change করব না (আপনার data intact থাকবে)
- Admin panel UI redesign করব না
- MySQL এ port করব না (আপনি চাইলে আলাদাভাবে করতে হবে)
- Existing features remove করব না — শুধু hosting-portable বানাব

---

## Technical Summary

| Component | File | Change |
|-----------|------|--------|
| Google Login | `src/pages/SignIn.tsx`, `src/integrations/lovable/index.ts` | Native Supabase OAuth |
| AI Gateway | `supabase/functions/_shared/ai-gateway.ts` | Verify all 6 functions use it + graceful fallback |
| Hardcoded URLs | `supabase/functions/*/index.ts` + DB trigger `notify_new_product` | Use env vars |
| Docs | `SELF_HOSTING.md` (new) | Complete deployment guide |

---

## অনুমতি চাই

উপরের ৪টি Phase আমি চালাব। কোনো step skip করতে চাইলে বলুন, নাহলে "yes" বললে শুরু করব।
