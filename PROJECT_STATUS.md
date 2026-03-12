# SabahLabs – Project Status & Handoff Notes
**Saved: March 11, 2026**

---

## 🚀 What's Been Built

A full-stack real-time multiplayer quiz platform:
- **Backend**: Node.js + Express + Socket.IO → deployed on **Railway**
- **Frontend (Host/Admin)**: React + Vite → deployed on **Vercel**
- **Mobile (Players)**: React Native + Expo → iOS app built, being submitted to **App Store**
- **Database**: PostgreSQL on Railway (auto-schema, no Supabase)

---

## 🔗 Live URLs

| Service | URL |
|---------|-----|
| Frontend (web) | https://sabahlabs-frontend.vercel.app |
| Backend API | https://sabahlabs-backend-production.up.railway.app |
| Privacy Policy | https://sabahlabs-frontend.vercel.app/privacy |

---

## 🍎 iOS App Store – Current Status

### Credentials (all set)
| Field | Value |
|-------|-------|
| Apple ID | sabahcomp@gmail.com |
| Team ID | B2NLF2RPG9 |
| Bundle ID | com.sabahlabs.app |
| ASC App ID | 6760389801 |
| EAS Project | @syedsabahhassan/sabnaya (slug can't be changed, doesn't matter) |

### Build Config (`mobile/eas.json`)
- Node: 20.19.4
- Xcode image: macos-sonoma-14.6-xcode-16.1
- autoIncrement: true
- Last successful build: build #11 (version 2.0.0)

### ⏳ WHERE WE LEFT OFF
**Build #11 was submitted to App Store Connect but failed** with:
> "Build number 11 for app version 2.0.0 has already been used"

### ✅ Next Step (resume here tomorrow)

**Step 1** — Trigger a new build (auto-increments to build #12):
```bash
cd trivia-app/mobile
eas build --platform ios --profile production
```

**Step 2** — Once build finishes, submit:
```bash
eas submit --platform ios --latest
```

**Step 3** — Go to appstoreconnect.apple.com and complete the listing:
- Upload screenshots from `mobile/screenshots/` folder (already resized to 1290×2796)
- Fill in description, keywords, subtitle (all in `APP_STORE_LISTING.md`)
- Set Privacy Policy URL: `https://sabahlabs-frontend.vercel.app/privacy`
- Complete Age Rating questionnaire (all "No" → 4+)
- Select the new build
- Hit **Submit for Review**

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `mobile/eas.json` | EAS build config (Xcode image, node version, Apple credentials) |
| `mobile/app.json` | Expo app config (bundle ID, version, projectId) |
| `mobile/package-lock.json` | Lockfile needed for EAS build (committed ✅) |
| `mobile/screenshots/` | 7 resized screenshots (1290×2796) ready for App Store |
| `APP_STORE_LISTING.md` | Copy-paste content for App Store Connect |
| `frontend/public/privacy.html` | Privacy policy page (deployed to Vercel) |
| `ARCHITECTURE.md` | Full technical architecture documentation |
| `README.md` | Setup and deployment guide |

---

## 🔐 Secrets & Passwords

| Secret | Value |
|--------|-------|
| Admin password (web) | sabahlabs-admin-2024 |
| Vercel env var `VITE_ADMIN_SECRET` | sabahlabs-admin-2024 |
| Vercel env var `VITE_SERVER_URL` | https://sabahlabs-backend-production.up.railway.app |
| Railway env var `ADMIN_SECRET` | sabahlabs-admin-2024 |
| Railway env var `DATABASE_URL` | ${{Postgres.DATABASE_URL}} (reference variable) |
| Mobile env var `EXPO_PUBLIC_SERVER_URL` | https://sabahlabs-backend-production.up.railway.app |

---

## ✅ Completed Work (this session)

- [x] Fixed "TypeError: fetch failed" on Vercel (absolute URLs + CORS fix)
- [x] Replaced Supabase with Railway PostgreSQL (`pg` + auto-schema)
- [x] Built JSON quiz import feature in admin panel
- [x] Full rebrand: Sabnaya → SabahLabs across all code
- [x] Updated README.md + created ARCHITECTURE.md
- [x] Created `quiz-template.json` sample file
- [x] Generated 1024×1024 SabahLabs app icon
- [x] Created `eas.json` with Apple credentials
- [x] Fixed multiple EAS build errors (Node version, Xcode version, lockfile, Yoga C++)
- [x] Successfully built iOS app (build #11) ✅
- [x] Resized screenshots to 1290×2796 for App Store
- [x] Created privacy policy page
- [x] Created App Store listing content document

---

## ⚠️ Known Limitations

- Mobile players see only coloured answer **tiles** (▲◆●■) — questions display on host screen only
- Mobile app is iOS only (no Android build yet)
- No player accounts — join with nickname + room code only
