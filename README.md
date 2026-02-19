# Form Bae (MVP)

Production-oriented MVP web app for trainer-managed workout plans, exercise form guidance, and progress tracking using Google Sheets as the primary data store.

## Architecture Decisions

- Stack chosen: **Option A** style architecture using **Next.js App Router + TypeScript + Tailwind + Google Sheets API**.
- Auth model: mobile number login (no OTP) with signed cookie session.
- Security mitigation for no OTP:
  - strict **allowlistFlag** in `Users` tab
  - trainer-created accounts / invite model
  - request-access queue in `Requests` tab
  - basic login rate limiting
- Data store: Google Sheets tabs as normalized tables.
- Virtual assistant: rule/template-based (`lib/rules/form-bae.ts`) with no paid external APIs.
- Video picker:
  - Primary: YouTube Data API v3 (`YOUTUBE_API_KEY`) to fetch/re-rank short videos
  - Fallback: manual URL entry by trainer
  - Supports bad-video reporting and trainer replacement flow

## Folder Structure

```txt
app/
  (public)/login
  (public)/request-access
  trainer/dashboard
  trainer/users/new
  trainer/users/[userId]
  trainer/plans/create
  trainer/plans/[planId]/edit
  trainer/exercises
  app/today
  app/plan
  app/log
  app/progress
  app/profile
  api/auth/login
  api/auth/logout
  api/request-access
  api/trainer/users
  api/trainer/plans
  api/trainer/exercises
  api/workouts/log
  api/body-log
  api/messages
  api/video/search
  api/video/report
components/
lib/
  auth/
  repo/
  rules/
  services/
  sheets/
scripts/
types/
styles/
```

## Google Sheets Schema (Tabs + Columns + Index Keys)

1. `Users`
- Columns: `userId, role, name, mobile, createdAt, trainerId, allowlistFlag`
- Index keys: `userId` (PK), `mobile`, `trainerId`

2. `Profiles`
- Columns: `userId, weight, height, age, chest, waist, biceps, dietPref, allergies, lifestyleJson, trainingDays, photosUrlsJson, updatedAt`
- Index keys: `userId` (PK/FK)

3. `Plans`
- Columns: `planId, userId, trainerId, title, weekStartDate, status, createdAt`
- Index keys: `planId` (PK), `userId`, `trainerId`, `status`

4. `PlanDays`
- Columns: `planDayId, planId, dayNumber, focus, notes`
- Index keys: `planDayId` (PK), `planId`

5. `Exercises`
- Columns: `exerciseId, name, primaryMuscle, equipment, defaultCuesJson`
- Index keys: `exerciseId` (PK), `name`

6. `PlanDayExercises`
- Columns: `planDayId, exerciseId, order, sets, reps, restSec, notes, videoId, videoUrl`
- Index keys: `planDayId`, `exerciseId`

7. `Videos`
- Columns: `videoId, exerciseId, url, title, channel, thumbnail, source, fetchedAt, score, searchQuery`
- Index keys: `videoId` (PK), `exerciseId`

8. `WorkoutLogs`
- Columns: `logId, userId, date, planId, planDayId, completedFlag, notes`
- Index keys: `logId` (PK), `userId`, `planId`, `date`

9. `SetLogs`
- Columns: `logId, exerciseId, setNumber, reps, weight, rpe, painFlag`
- Index keys: `logId`, `exerciseId`

10. `BodyLogs`
- Columns: `entryId, userId, date, weight, chest, waist, biceps`
- Index keys: `entryId` (PK), `userId`, `date`

11. `Messages`
- Columns: `messageId, userId, planId, senderRole, text, createdAt`
- Index keys: `messageId` (PK), `userId`, `planId`

12. `Requests`
- Columns: `requestId, mobile, name, notes, createdAt, status`
- Index keys: `requestId` (PK), `mobile`, `status`

## Setup

1. Install dependencies
```bash
npm install
```

2. Configure env
```bash
cp .env.example .env.local
```
Fill values:
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `SESSION_SECRET`
- optional `YOUTUBE_API_KEY`

3. Share Sheet with service account email (`GOOGLE_CLIENT_EMAIL`) as Editor.

4. Initialize tabs/headers
```bash
npm run init:sheets
```

5. Seed admin + trainer + base exercises
```bash
npm run seed
```
Default admin mobile: `10000000000`  
Default trainer mobile: `10000000001`

6. Run app
```bash
npm run dev
```

## YouTube Data API v3 Setup

1. Create/choose GCP project.
2. Enable **YouTube Data API v3**.
3. Create API key.
4. Set `YOUTUBE_API_KEY` in env.

Behavior:
- On exercise creation, app attempts auto-search (`exercise proper form shorts`).
- Ranking prefers short duration and title keyword relevance, with view count boost.
- Stores `title, channel, url, thumbnail, fetchedAt, searchQuery, score` in `Videos`.
- If unavailable, trainers can supply manual URL.

## Key Routes

Public:
- `/login`
- `/request-access`

Trainer:
- `/trainer/dashboard`
- `/trainer/users/new`
- `/trainer/users/[userId]`
- `/trainer/plans/create?userId=`
- `/trainer/plans/[planId]/edit`
- `/trainer/exercises`

Admin:
- `/admin/dashboard`

User:
- `/app/today`
- `/app/plan`
- `/app/log`
- `/app/progress`
- `/app/profile`

## Deploy (Vercel)

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add all env vars in project settings.
4. Deploy.

Notes:
- Use production-grade `SESSION_SECRET`.
- Keep allowlist enforced for no-OTP flow.
- Move in-memory rate limit to Redis/Upstash for multi-instance production.

## MVP Limitations / Next Hardening

- No OTP means identity assurance is weaker.
- In-memory rate limiter is instance-local.
- File uploads are URL-based placeholders in MVP; production should use object storage (S3/GCS).
- Google Sheets concurrency is limited; a DB migration path should be planned beyond MVP scale.
