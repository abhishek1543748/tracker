# Tracker — Readiness Assessment

## Current Status: ❌ NOT Ready to Deploy

The project is a **bare Vite + React scaffold**. The actual tracker logic exists but is completely disconnected from the app.

---

## What Exists vs What's Needed

### ✅ Done (Infrastructure)
| File | Status | Notes |
|------|--------|-------|
| `tracker/` Vite project | ✅ Scaffolded | `npm run dev` would work |
| `src/lib/supabase.js` | ✅ Ready | Reads env vars, exports `supabase` client |
| `.env.example` | ✅ Done | Documents `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `MinorProject/phase_tracker.jsx` | ✅ Logic done | Full PhaseTracker component with all 9 phases |
| `package.json` | ✅ Good | Has `@supabase/supabase-js`, `lucide-react`, React 19 |

---

### ❌ Critical Blockers (App Won't Work)

#### 1. `App.jsx` is still the default Vite template
The file is the default "Get started / Count is 0" boilerplate. The `PhaseTracker` component is **never imported or rendered**.

**Fix:** Replace `App.jsx` content to import and render `PhaseTracker`.

---

#### 2. `window.storage` API doesn't exist
`phase_tracker.jsx` calls `window.storage.get()` and `window.storage.set()` for persistence — this is a custom API that **does not exist in any browser or in Supabase**. The app will crash immediately on load.

```js
// ❌ These calls will throw — window.storage is undefined
const result = await window.storage.get(STORAGE_KEY, true);
await window.storage.set(STORAGE_KEY, JSON.stringify(next), true);
```

**Fix options (pick one):**
- **Option A — Supabase backend**: Replace `window.storage` calls with Supabase DB reads/writes. Requires a `completions` table in Supabase.
- **Option B — localStorage only**: Replace with `localStorage.getItem/setItem`. Simple, no backend needed, but data is per-browser (not shared across team).
- **Option C — Supabase + localStorage hybrid**: Use Supabase for shared state, fallback to localStorage on error.

---

#### 3. `phase_tracker.jsx` is in the wrong location
It lives at `MinorProject/phase_tracker.jsx` (outside the Vite project). It needs to be moved to `tracker/src/components/PhaseTracker.jsx`.

---

#### 4. No `.env.local` file
Supabase credentials are required at runtime. The `supabase.js` will **throw an error** without them — even if you fix everything else.

**Fix:** Create `tracker/.env.local` with real values:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-real-anon-key
```

---

#### 5. No Supabase database table (if using Supabase for storage)
If choosing the Supabase approach, you need a table. Suggested schema:

```sql
CREATE TABLE completions (
  id         text PRIMARY KEY,       -- task ID e.g. "p0-t2"
  completed_by text NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- Allow anonymous reads and writes (or use RLS with auth)
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON completions FOR SELECT USING (true);
CREATE POLICY "public insert" ON completions FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete" ON completions FOR DELETE USING (true);
```

---

### ⚠️ Minor Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| `index.html` title is just `"tracker"` | Low | Change to `"AASIST Phase Tracker"` |
| `phase_tracker.jsx` uses `className="w-full"` (Tailwind) but no Tailwind is installed | Medium | Replace with `style={{ width: "100%" }}` |
| `animate-spin` class on Loader2 won't work without Tailwind | Medium | Add a CSS keyframe or use inline animation |
| No 404/error boundary | Low | Add React error boundary |
| README is default Vite template text | Low | Update to describe the project |

---

## Recommended Fix Order

```
1. Create tracker/src/components/PhaseTracker.jsx  (move & fix the component)
2. Replace window.storage with localStorage OR Supabase
3. Fix the Tailwind class issues (w-full, animate-spin)
4. Update App.jsx to render <PhaseTracker />
5. Create .env.local with Supabase credentials
6. (If Supabase) Create the completions table in Supabase dashboard
7. Update index.html title
8. Run: npm run dev — verify it works
9. Run: npm run build — verify production build succeeds
```

---

## Summary

| Category | Status |
|----------|--------|
| Core logic | ✅ Written (in wrong place) |
| App wiring | ❌ Missing |
| Data persistence | ❌ Broken (`window.storage` doesn't exist) |
| Environment config | ❌ No `.env.local` |
| Supabase DB schema | ❌ Not created |
| Tailwind classes | ⚠️ Used but not installed |
| Build/deploy ready | ❌ No |
