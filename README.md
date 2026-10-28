# MarineOps — Fleet Management Dashboard

**MarineOps** is a portfolio-grade maritime operations application built with **React + Vite**. It gives engineers and fleet managers a single place to manage vessels, schedule maintenance, log fuel consumption, and export operational records. The interface is an original design built for this project.

> **Portfolio disclosure:** MarineOps is an independent demonstration project. The starter vessel names, operating locations, tasks, and fuel logs are **fictional**. This is not a live vessel tracking system, connected engine sensor platform, certified emissions calculator, or production maritime safety system.

## What the application can do

- **Overview dashboard:** fleet totals, overdue work, tasks due within 14 days, six-month fuel trend, vessel status breakdown, and maintenance queue.
- **Vessel management:** add, edit, delete, filter and search vessels; record operational status, vessel type, location, capacity, manager and notes. Deleting a vessel also deletes its linked records (after confirmation).
- **Maintenance planning:** add tasks, assign priority, due date, engineer and systems; edit/delete tasks; mark tasks complete; filter by priority-relevant deadlines and status.
- **Fuel analytics:** enter fuel logs with litres, nautical miles and engine hours; filter by vessel and period; view calculated fuel intensity (L/nm), charts, and history.
- **Reporting:** CSV exports for vessel lists, maintenance tasks, and fuel logs; includes a mitigation against spreadsheet formula injection.
- **Cloud accounts (optional):** Supabase email login, PostgreSQL persistence, and row-level security isolating users' records.
- **Demo mode (no setup):** immediately usable fictional dataset persisted in *your browser's localStorage*, with a reset option under Reports.

## Run on your Mac (local preview)

Install Node.js 20+ from https://nodejs.org (if not already installed).

```bash
npm install
npm run dev
```

Open the local URL displayed in Terminal, usually http://localhost:5173. **No Supabase setup is required for demo mode.**

To verify the application:

```bash
npm test
npm run build
```

## Host it for free with GitHub + Vercel

1. Log in to GitHub, create a **public** repository named `marineops`, and upload **all files and folders from inside this project**, including `package.json`, `src`, `public`, `sql`, `index.html`, and `vercel.json`. Do not upload the ZIP file or the `node_modules` folder.
2. Visit https://vercel.com, select **Continue with GitHub**, then **Add New → Project**.
3. Choose your new `marineops` repository, and import it. Vercel should detect **Vite** automatically.
4. The build command should be `npm run build`; output directory: `dist`.
5. Click **Deploy**. The app will work straight away in **demo mode**. Every push to GitHub can redeploy your Vercel site automatically.
6. Add the **Vercel live URL and GitHub repository URL** to your personal portfolio as a new project.

**Note:** The GitHub Pages setup used for your other websites differs from this React deployment. Vercel automatically runs the build. No backend is required for demo mode.

## Optional: turn on real cloud storage and login

To make accounts work and sync records across browsers/devices:

1. Create a project at https://supabase.com/dashboard.
2. In the Supabase project, open **SQL Editor**. Copy and run `sql/supabase_schema.sql`. This creates the three tables and enables ownership-based **Row Level Security** policies.
3. Open **Project Settings → API** / **Connect** (menu label may vary). Copy your **Project URL** and **publishable / anon key**. **Never use or commit the service_role/secret key.**
4. In Vercel open **Project → Settings → Environment Variables**. Add:

   ```text
   VITE_SUPABASE_URL       = https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY  = YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
   ```

5. **Redeploy** the application so Vite can bake the public values into the frontend build.
6. In Supabase Authentication settings, enable email/password sign-up. Supabase may require email verification; check the SMTP limitations for production delivery. Configure the project Site URL to match your Vercel URL if using confirmation links.
7. Open MarineOps → **Connect Supabase** → **Create account** or **Sign in**. After login, a new private workspace begins empty. Add your own vessels. (The demo records stay separate and are *not* silently inserted into the database.)
8. Review Supabase policies and account security before treating any records as operational. Use non-sensitive demonstration data for this portfolio.

**Security design:** All three PostgreSQL tables contain `user_id`; RLS restricts select, insert, update and delete to authenticated users on their own records. Child vessel relationships use a composite foreign key to prevent linking a task or fuel log to someone else's vessel. Browser code never receives a privileged Supabase secret.

## Technologies

React 18, Vite, JavaScript ES Modules, CSS, Lucide React, Recharts, Supabase JS (optional), PostgreSQL + RLS (optional), Vercel.

## Suggested employer portfolio entry

**MarineOps — Fleet Operations & Maintenance Dashboard**

Developed a responsive React dashboard for vessel management, preventative maintenance scheduling, fuel consumption analysis and downloadable fleet reports. Added form validation, searchable records, interactive data visualisations and a cloud-ready Supabase data layer with account-level access policies. Demonstrated maritime domain knowledge through realistic, explicitly fictional fleet scenarios.

## Project limitations

- Demo browser data is stored in localStorage, so it is not shared across devices or accounts.
- Authentication and remote PostgreSQL storage require the additional Supabase setup described above.
- Demo vessels, inspections, and fuel records are fictional, not live or independently verified.
- Fuel intensity (L/nm) is a simple descriptive calculation, not a certified efficiency or emissions metric.
- No automatic email or push notifications, live vessel AIS, equipment telemetry, or machine-learning predictions.
- Intended to demonstrate application development, not replace safety-critical maintenance software.

## Folder guide

```text
marineops/
  index.html
  package.json
  vite.config.js
  vercel.json
  .env.example
  .gitignore
  README.md
  public/favicon.svg
  src/main.jsx
  src/App.jsx
  src/styles.css
  src/lib/demo.js
  src/lib/metrics.js
  src/lib/metrics.test.js
  src/lib/supabase.js
  sql/supabase_schema.sql
```
