# LOCAL APP-WEB DEMO HANDOFF — CaLẻ / Now

## 1. Goal

Build a **mobile app demo** that links with the **local web demo** on the same developer machine.

The goal is not production deployment yet. The goal is:

```text
Employer uses the local web app
→ Worker uses the local mobile app
→ Both read/write the same demo data
→ The demo flow looks connected and realistic
```

## 2. Current web state

The current web app is a Next.js MVP that uses:

- Zustand stores
- localStorage persistence
- mock lifecycle logic
- mock wallet/ledger
- mock disputes
- mock notifications
- mock verification

This means current data is stored inside the browser profile.

Important limitation:

```text
localStorage is browser-profile scoped.
Mobile app cannot read web localStorage directly.
Another Chrome profile cannot read the same localStorage either.
```

So if the mobile app must link with the web demo, both should use a **shared local API/mock backend**.

## 3. Required local demo architecture

Recommended local architecture:

```text
Next.js Web App
http://localhost:3000

Shared Mock API
http://localhost:3000/api
or
http://localhost:4000

Expo Mobile App
calls the same API
```

For a real phone, the mobile app should not use `localhost`. It should use the laptop LAN IP:

```text
EXPO_PUBLIC_API_BASE_URL=http://<LAPTOP_LAN_IP>:3000/api
```

Example:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.12:3000/api
```

## 4. API base URL rules

Use different base URLs depending on where the app runs:

```text
Web app:
- /api

iOS Simulator:
- http://localhost:3000/api may work

Android Emulator:
- http://10.0.2.2:3000/api

Real phone:
- http://<Laptop LAN IP>:3000/api
```

The Expo mobile app should use an environment variable:

```text
EXPO_PUBLIC_API_BASE_URL=http://<Laptop LAN IP>:3000/api
```

## 5. Recommended demo approach

Do not build the mobile app with separate fake data if the requirement is to link with web.

Use one of these approaches:

### Option A — Recommended for local demo

Create shared mock API routes inside the Next.js app.

Example:

```text
/api/auth
/api/shifts
/api/applications
/api/disputes
/api/wallet
/api/notifications
/api/lifecycle/sync
```

Both web and mobile can call these routes.

### Option B — Small local mock server

Create a separate local server on port 4000.

Example:

```text
http://localhost:4000/shifts
http://localhost:4000/applications
```

Mobile calls the laptop IP:

```text
http://<Laptop LAN IP>:4000/shifts
```

### Option C — Production-style backend later

Use Supabase, Firebase, Express/Postgres, etc.

This is better long-term, but not required for the first local demo.

## 6. First shared flow to prove sync

Do not try to sync every feature at once.

Start with this smallest end-to-end flow:

```text
Employer creates a shift on web
→ Worker opens mobile app
→ Worker sees that shift
→ Worker applies from mobile
→ Employer sees the application on web
```

If this works, continue with:

```text
Employer approves on web
→ Worker app sees approved status
→ Worker checks in from app
→ Employer web sees worker checked in
```

Then:

```text
Worker checks out from app
→ Employer web confirms or disputes
→ Wallet/ledger updates on both sides
```

## 7. First API endpoints to implement

### Auth

```text
POST /api/auth/login
POST /api/auth/register
GET /api/me
```

### Users

```text
GET /api/users/:id
GET /api/workers/:id/profile
GET /api/employers/:id/profile
PATCH /api/workers/:id/profile
PATCH /api/employers/:id/profile
```

### Shifts

```text
GET /api/shifts
GET /api/shifts/:id
POST /api/shifts
PATCH /api/shifts/:id
POST /api/shifts/:id/repost
POST /api/shifts/:id/deposit
POST /api/shifts/:id/cancel
```

### Applications

```text
POST /api/shifts/:id/apply
POST /api/applications/:id/approve
POST /api/applications/:id/reject
POST /api/applications/:id/check-in
POST /api/applications/:id/mark-present
POST /api/applications/:id/mark-absent
POST /api/applications/:id/check-out
POST /api/applications/:id/confirm-completion
```

### Disputes

```text
POST /api/applications/:id/dispute
POST /api/disputes/:id/respond
POST /api/disputes/:id/request-more-evidence
POST /api/disputes/:id/resolve
```

### Wallet

```text
GET /api/wallet
GET /api/wallet/ledger
```

### Notifications

```text
GET /api/notifications
POST /api/notifications/:id/read
```

### Lifecycle

```text
POST /api/lifecycle/sync
```

Used to sync:

- expired applications
- shift started/ended states
- auto-release after 12 hours
- no-show/attendance states
- notification triggers

## 8. Mobile app folder recommendation

Create the mobile app in a separate folder:

```text
/mobile
  app/
  src/
  package.json
```

Recommended stack:

```text
Expo React Native
TypeScript
Expo Router or React Navigation
```

Do not mix mobile screens into the existing Next.js `src/app` folder.

## 9. What mobile can reuse from web

Can reuse conceptually:

- product rules
- TypeScript types
- status labels
- validation rules
- API contract
- user flows
- Vietnamese copy direction

Should not reuse directly:

- Next.js pages
- DOM-specific React components
- browser localStorage stores
- web-only CSS/Tailwind components
- web routing logic

If needed later, extract shared code into:

```text
/packages/shared
```

Possible shared modules:

```text
types
status labels
time/lifecycle helpers
validation helpers
API client
```

## 10. Mobile screens to build first

### Worker first

1. Login / Register
2. Job List
3. Shift Detail
4. My Applications
5. Current Shift
6. Check-in / Check-out
7. Dispute Detail / Respond
8. Wallet
9. Notifications
10. Profile / Verification

### Employer second

1. Employer Dashboard
2. Create Shift
3. Shift Detail
4. Applicant Buckets
5. Attendance Controls
6. Confirm Completion / Dispute
7. Wallet
8. Notifications
9. Employer Profile / Verification

### Admin

Admin can remain web-only for MVP unless assigned later.

## 11. Current product flows already implemented on web

The web MVP currently includes:

- employer registration and verification gate
- shift posting with 100% deposit rule
- evidence requirement by job risk
- worker apply / employer approve
- expired pending applications
- check-in / mark present / mark absent
- worker checkout with checklist/evidence
- employer confirm or dispute
- worker dispute / absent dispute
- auto-release after 12 hours
- wallet and ledger
- timeline logs
- repost shift flow
- worker job list application status
- basic admin dispute handling

## 12. Deferred or incomplete areas

Do not assume these are complete:

- full admin dispute rebuild
- admin request-more-evidence UI
- admin dispute badge if not wired
- rating report to admin
- chat/contact
- real backend
- real payment gateway
- production authentication
- push notifications
- GSAP/motion polish

## 13. Do not do

Do not:

- build mobile with separate fake data if the goal is web-app sync
- assume mobile can read web localStorage
- rerun old Kiro tasks from scratch
- edit web business logic without reading HANDOFF/VISUAL_QA/current status
- add chat/contact unless explicitly assigned
- add GSAP/motion before core demo sync is stable
- mark store-only features as mobile-ready if no API/UI path exists

## 14. Recommended Kiro prompt for the mobile developer

Paste this into Kiro after pulling the repo:

```text
You are building a mobile app demo that links with the local web demo on the same developer machine.

Before editing anything, read:
1. LOCAL_APP_WEB_DEMO_HANDOFF.md
2. HANDOFF.md
3. VISUAL_QA.md
4. .kiro/specs/phase-10c-escrow-release/requirements.md
5. .kiro/specs/phase-10c-escrow-release/design.md

Important context:
The existing web app uses Zustand + localStorage. The mobile app cannot share web localStorage. For local app-web demo sync, we need a shared local API/mock backend.

First, propose the architecture:
- Next API mock backend vs small local mock server
- API base URL strategy for simulator vs real phone
- minimal endpoints needed for the first synced flow
- data migration/adapter plan from localStorage to shared mock API
- what web actions should move to API first
- what mobile screens should be built first

Do not implement the mobile app yet.
Do not edit existing web business logic yet.
Do not rerun old Kiro tasks.

Return:
1. Recommended local demo architecture
2. API base URL setup
3. First synced flow
4. Minimal endpoints
5. Web migration/adapter plan
6. Mobile screens to build first
7. Risks and manual QA steps
```

## 15. Manual QA for local app-web sync

First QA flow:

```text
1. Start web locally.
2. Start shared mock API.
3. Start Expo mobile app.
4. Employer logs in on web.
5. Employer creates a shift.
6. Worker opens mobile app.
7. Worker sees the shift.
8. Worker applies.
9. Employer refreshes web.
10. Employer sees worker application.
```

Second QA flow:

```text
1. Employer approves worker on web.
2. Worker mobile sees approved status.
3. Worker checks in from mobile.
4. Employer web sees worker checked in.
5. Employer marks present.
6. Worker mobile sees employer confirmation.
```

Third QA flow:

```text
1. Worker checks out from mobile.
2. Employer web sees checklist/evidence.
3. Employer confirms completion or disputes.
4. Wallet/ledger updates.
5. Notifications appear on both sides.
```

## 16. Key risk

If the web remains fully localStorage-based and the app uses its own local state, the demo will not be linked.

The app-web demo is only truly linked when both use the same API/data source.

For local demo, the shared API can still be mock-only.
It does not need to be production-ready yet.
