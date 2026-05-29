# Mise — Project Document

> **Living document.** This is the single source of truth for what Mise is, why it
> exists, what's built, and where it's going. Update it as decisions are made and
> features ship. If starting a fresh conversation, hand over this file to get back
> up to speed quickly.

_Last updated: May 26, 2026_

---

## 1. Vision

**Mise** is a nutrition app for healthy, clean weight gain — built first for people
who struggle to eat enough to hit their goals, and who want the planning and
ingredient-gathering to be as effortless as possible.

The name comes from *mise en place* ("everything in its place") — the chef's practice
of prepping everything before cooking. That's the spirit: Mise does the prep so the
user just has to follow the plan.

**The one-line pitch:** *Clean nutrition planning that keeps you consistent — powered
by your real burn data, not generic formulas.*

**Who it's for (initial focus):**
- Naturally lean people trying to gain weight cleanly
- People who want muscle gain without the "gym-bro" framing
- Anyone who finds calorie tracking tedious and quits
- Long term, broader: maintenance, recovery, women building muscle, etc.

**Core differentiators vs. the market (e.g. MyFitnessPal):**
- **Whoop integration** — calorie targets use *real* daily burn data, not static multipliers
- **Meal adjustment** — when you miss/skip a meal, the plan adapts
- **Simple, uncluttered UI** — one clean meal per item, not a pile of separate diary lines
- **Clean/quality food values** baked in (organic, plastic-free prep, whole foods)
- **(Long term) Instacart integration** — auto-source a week's ingredients for Sunday delivery

---

## 2. Core Principles

These are the guiding values for every product and engineering decision:

1. **Simple for the user, sophisticated underneath.** The user does the minimum; the
   app does the heavy lifting (macros, micronutrients, calculations) invisibly.
2. **Plumbing before aesthetics.** Get the structure working first; polish (photos,
   visual refinement) comes after the foundation is solid.
3. **Build for today, don't box in tomorrow.** Make today's choices in a way that
   doesn't force painful restructuring later. Lay groundwork, but don't build the
   whole cathedral up front.
4. **Do the core job well; let power users go deeper if they want.** Resist feature
   creep. A focused tool that does the job beats a complicated one that overwhelms.
5. **Clean/quality food values.** Prefer whole foods, organic, and prep that avoids
   things like heating food in plastic. Stated as preferences, never as overstated
   health claims.
6. **One step at a time.** Build, deploy, verify, then move on. Don't let half-built,
   untested features pile up. Close loops.

---

## 3. Current State (what's built & working)

**Infrastructure**
- Frontend: React + Vite + Tailwind, deployed on **Vercel** at **mise.fit**
- Backend: FastAPI (Python), deployed on **Railway**
- Database: PostgreSQL on **Supabase** (backend connects via pooler connection string)
- Domain: **mise.fit** (purchased; .com held by a squatter, not pursued)
- Deploy flow: `git push` → Vercel + Railway auto-deploy

**Branding**
- Name: **Mise** (rebranded from original "BulkUp")
- Logo: cream square with navy circular plate outline + italic lowercase serif "m"
- Palette: **navy (#1A2E45) + cream (#F5EFE0)** — calm, premium, "healthy/reliable/simple"
- App fully recolored to match the logo palette

**Features built & verified**
- **Auth system** — signup, login, logout, JWT tokens, route protection, per-user data isolation
- **Whoop integration** — OAuth connect, pulls real calorie burn, tokens stored per-user
- **Meal creation** — add meals (name, calories, meal time) via an in-app popup form
- **Tagging system** — 25 seeded tags in 3 types:
  - *Primary* (shown on cards): high protein, low carb, vegan, vegetarian, quick,
    budget friendly, organic, plastic free
  - *Restriction* (shown, safety-relevant): gluten-free, dairy-free, nut-free,
    soy-free, egg-free
  - *Secondary* (hidden, for filtering): savory, sweet, spicy, one-pan, no-cook,
    meal prep, freezer-friendly, post-workout, whole food, no seed oils, grass-fed,
    wild-caught
  - Tags managed in code/DB (no admin UI by design); tag picker in add-meal form;
    chips on meal cards (primary + restriction shown, secondary hidden)
- **Three-tier meal display** — Earlier Today (faded compact rows) / Up Next (hero
  card w/ image placeholder, tags, action buttons) / Later (medium cards)
- **Calorie tracking** — daily target from TDEE + Whoop burn; progress bar
- **Allergen tags** — added 4th tag type "allergen" (contains-egg, contains-dairy,
  contains-gluten, contains-nuts, contains-peanuts, contains-soy, contains-shellfish,
  contains-fish) for ingredient safety integrity
- **USDA integration** — backend search of USDA FoodData Central (filtered to clean
  data types); food details/portions endpoint; ingredient engine that calculates a
  meal's nutrition from its ingredients (POST /meals/from-ingredients). Meal stays ONE
  clean item; ingredients roll up underneath (anti-MyFitnessPal). Lesson learned:
  Foundation foods 404 on the details endpoint but return full data in search.
- **Curated foods database** — OWN clean food list (the key feature). Tables: foods
  (full nutrition per 100g: 7 macros + 22 micronutrients), food_portions (natural
  serving sizes, Style A — natural unit default + grams fallback always), food_tags.
  Users search this clean curated list, NOT raw USDA ("search egg → get one clean
  Egg"). USDA is the SOURCE (public-domain, free, ownable) used to populate nutrition
  behind the scenes. 19 starter foods seeded with accurate nutrition + portions:
  eggs, chicken breast, salmon (wild + farmed), 90% lean ground beef, Greek yogurt,
  oats, white rice (cooked + dry), sweet potato, peanut butter, almonds, olive oil,
  avocado, spinach, banana, broccoli, whole milk, chocolate milk.
- **Ingredient builder UI** — in-app meal builder searches the curated list, shows
  portions, live nutrition preview, running totals, dashed "add another ingredient"
  flow; builds a meal from multiple ingredients with auto-calculated nutrition. Live
  and verified on mise.fit.
- **Curated breads/bagels (Day 1 curation)** — 7 added: plain/egg/whole-wheat bagels,
  white/whole-wheat/sourdough/multigrain breads. (Everything bagel skipped — USDA has
  none, and it's nutritionally ~identical to plain, confirmed against a real TJ's label.)
  Seeder made insert-only by default (skips existing, no USDA call) with a `--force`
  flag to refresh — keeps adds fast as the list grows.
- **Whoop token auto-refresh (FIXED)** — root cause of stale "estimated" burn: the
  access token expired (~1hr) and was never refreshed, so fetches 401'd silently and
  fell back to the formula. Now: on a 401, the code uses the stored refresh token to
  get a new access token, saves it, and retries. Extracted into shared helper
  `fetch_daily_calories_with_refresh()` used by both the endpoint and the capture
  script. Whoop data now stays current. (Lesson: webhooks are the wrong tool for
  "current burn" — Whoop only webhooks discrete events, not continuous calorie ticks;
  polling + token refresh is the right approach. A webhook receiver was built but is
  unused.)
- **TDEE math verified** — confirmed NOT double-counting BMR: Whoop's daily number is
  TOTAL burn (includes BMR), and the code does `activity = max(0, whoop_total - bmr)`
  then `target = bmr + activity + surplus`. Correct. Also learned Whoop "daily" cycles
  align to sleep/wake (~3:48am), not calendar midnight, and the current day's cycle is
  OPEN (climbs through the day) — so a partial reading early in the day is normal pace,
  not an error.
- **Burn display: benchmark vs. current pace** — Home page shows (1) an EATEN→target
  progress bar (target anchored to the stable formula benchmark, not the live Whoop
  number, so it doesn't jump around), and (2) a progress RING showing real Whoop burn
  "so far today" filling toward the "expected (typical day)" benchmark burn, with one
  plain-language helper line. /calories/today now returns `benchmark` and `whoop`
  (connected + burned_so_far) as separate values. Live and verified.
- **Burn-snapshot data collection** — `burn_snapshots` table (user_id, date,
  recorded_at, burned_kcal) + a standalone capture script (reuses the token-refresh
  helper, skips None/unscored readings) running on an HOURLY Railway CRON SERVICE
  (separate service, same repo, root dir `backend`, start cmd
  `python capture_burn_snapshots.py`, cron `0 * * * *`, needs DATABASE_URL +
  WHOOP_CLIENT_ID/SECRET). Verified inserting one row/hour. Purpose: accumulate the
  time-series history needed to LATER build a personalized end-of-day burn prediction
  (the prediction model itself is deferred until enough data exists — see roadmap).
- **Whoop connect simplified to ONE button (FIXED a recurring breakage)** — the old
  flow let you enter Whoop client_id/secret through a Profile UI form, stored in an
  IN-MEMORY `state.WHOOP_CREDS` dict that WIPED on every redeploy → Whoop kept breaking.
  Fix: client_id/secret are app-level credentials that live ONLY in Railway env vars
  (WHOOP_CLIENT_ID/SECRET/REDIRECT_URI), persistent. Removed the credential-entry form
  entirely; Profile now has a single "Connect Whoop" button → GET /whoop/connect builds
  the OAuth URL from env-var creds → redirect to Whoop → callback stores the USER's
  tokens. Users never enter credentials. (Cleanup still TODO: delete the now-unused
  POST /whoop/credentials endpoint + the in-memory override in state.py.)
- **Fixed infinite redirect loop** — authFetch was doing window.location='/login' on
  ANY 401. A feature-endpoint 401 (e.g. "Whoop not connected") wrongly triggered a
  login redirect; with a still-valid app token, ProtectedRoute bounced back → refetch →
  401 → loop, making the app unusable. Fix: authFetch only hard-redirects on 401s from
  AUTH paths (/auth/, /users/me); feature 401s just throw and are handled gracefully.
- **Session validation + graceful expiry (FIXED "silently broken / must log out & in")**
  — AuthContext used to treat "a token string exists" as logged-in, so an EXPIRED token
  showed the app as logged in while every request 401'd (broken, confusing). Now
  AuthContext validates the token on load via GET /users/me: 200 → valid (store user);
  401 → clear token + mark sessionExpired; network error → leave token alone (transient).
  isLoggedIn = !!user (validated). ProtectedRoute shows "Loading…" during the check (no
  flash), then redirects expired sessions to /login with an amber "Your session expired
  — please log in again" banner. (Note: JWTs are 7-day; confirm JWT_SECRET is a stable
  Railway env var so redeploys don't invalidate everyone's tokens.)

---

## 4. Roadmap (phased plan)

### Active phase — DONE (core built), now GROWING the curated list
- **Curated foods + ingredient builder** — BUILT and live. Meals built from a clean,
  curated food list; nutrition auto-calculated; meal stays one clean item. (See
  Features section.)
- **Current focus:** grow the curated food list from ~19 toward ~70 staples, driven
  by real eating gaps (see "Curation Roadmap — Week 1" below).

### Data source plan (decided)
- **NOW:** USDA FoodData Central — free, public-domain, ownable, good for whole foods.
  Used to populate the curated list. Budget-friendly (paid APIs out of budget pre-revenue).
- **LATER (once profitable):** evaluate a premium paid nutrition database for richer/
  more complete data. Candidate found: **NCC / NDSR database** (Univ. of Minnesota) —
  what competitor MacroFactor uses; licensed/paid, more complete micros, but typically
  can't be copied/owned (query-only). Upgrade target when revenue justifies it.

### Near-term (after curation list is fuller)
- **Barcode scanning (IN PROGRESS — Edamam chosen & validated, schema done)** — felt
  like a real competitive convenience moat (fast logging). The scan itself is easy; the
  hard part is the barcode→nutrition DATA. Path explored: Open Food Facts (free) maps
  barcode→product fine but its NUTRITION is messy/incomplete and doesn't fit our clean
  schema. Nutritionix steered toward an enterprise sales call (avoided). **DECISION:
  use Edamam** ($14/mo tier, self-serve, ~615k UPCs) as the now-solution; **NCC/NDSR
  (Univ. Minnesota — what MacroFactor uses) is the post-revenue premium upgrade.**
  Architecture chosen: **"scan once, own forever"** — barcode → check our DB first → if
  new, fetch from Edamam → normalize into our Food schema → SAVE it (so next scan is
  instant + clean + owned). **DONE:** (1) Edamam validated against real TJ's products
  (found store-brand items, returns per-100g macros + partial micros + serving size,
  maps to our schema — confirmed good enough); (2) signups disabled (ALLOW_SIGNUPS
  toggle) so usage stays solo within Edamam's tier; (3) `barcode` column added to Food
  (nullable, unique, indexed) + migration 006. **NEXT:** (a) add EDAMAM_APP_ID +
  EDAMAM_APP_KEY to Railway env (server-side only); (b) backend endpoint: barcode →
  check DB → Edamam → normalize → save + return; (c) camera scanner UI → add to meal.
  Mapping decided: 14 Edamam fields map directly (cals, protein, carbs, fat, fiber,
  sugar, sat fat, cholesterol, sodium, potassium, calcium, iron, vit A, vit C); missing
  micros stored null; brand stays in name (no brand column); category = "branded";
  serving weight → a "1 serving" portion. (Edamam credentials were pasted publicly
  during testing — ROTATE them.)
- **Mobile / iPhone app (plan decided)** — does NOT require Swift. Path:
  **PWA now → Capacitor for App Store later.** A PWA (manifest + service worker on the
  existing React app) makes Mise installable via "Add to Home Screen" with near-zero
  new code, no Apple Developer account, no review — good for getting it on the user's
  (and testers') phones to validate. **Capacitor** later wraps the same React app into
  a real App-Store-submittable native app (needs Apple Developer $99/yr, Xcode, review)
  — do this when ready for real public distribution. React Native is a rewrite — NOT
  recommended (overkill, throws away the web UI). Capacitor can wrap a PWA, so doing
  the PWA first is a stepping stone, not a detour.
- Real food photos on meal cards (image sourcing + Supabase storage) — deferred polish
- Preloaded curated meal library (system-owned meals so the app isn't empty for new users)
- Browse/search/filter the meal library by tag

### Longer-term vision
- **Micronutrient tracking** — invisible to the user; the app knows e.g. "spinach
  provides X, Y, Z" so meal plans are more holistic and healthy (powered by USDA data
  which includes micronutrients)
- **Taste-profiling onboarding** — quick "like/dislike" swipe through ~20 dishes/
  ingredients to build a preference profile and curate meals (not overwhelming)
- **Instacart integration** — the headline long-term vision: take a week's planned
  meals → derive the ingredient list → auto-order from Instacart → Sunday delivery.
  Tags like "organic" / "plastic free" become sourcing hooks. Requires structured,
  "canonical" ingredients (one master entry per ingredient so quantities sum across
  recipes) — this is why ingredient structure matters long-term.
- **Personalized burn-curve prediction** — learn each user's daily burn *pattern*
  from the hourly burn_snapshots (e.g. "this user works out ~7pm, so their burn is
  flat midday then spikes evening") and project their END-OF-DAY Whoop total from a
  partial reading. Turns the partial-day problem into a "projected total" feature.
  PREREQUISITE (already running): hourly snapshot collection — the model is DEFERRED
  until weeks of data accumulate. Don't build the model until there's enough history.
- **HSA/FSA payment** (future idea) — let users pay with HSA/FSA funds. Note: not
  automatic — usually needs Letter of Medical Necessity / medical-expense positioning
  + a compatible payment processor. Down-the-road, once there's revenue/positioning.

---

## 4a. Curation Roadmap — Week 1 (growing the curated food list)

Goal: grow the curated list from ~19 to ~70 staples, one focused batch per day.
Driven by REAL eating gaps — cut anything you won't actually eat (don't add for
volume; curation/quality is the whole edge). User signals when a new "day" starts
(assistant has no sense of time between sessions). Workflow per batch: search for
clean fdcIds → add to seed_foods.py with portions → run via Railway CLI.

- [x] **Day 2 — Cheeses & dairy: DONE.** Added 14: Mexican blend (regular + low-fat),
      cheddar (sliced), mozzarella, parmesan, pepper jack (=Monterey Jack — USDA has no
      pepper jack), American (Foundation entry 747429 — most but not all 29 nutrients;
      fine for now), Swiss, provolone, string cheese (=part-skim mozzarella), cottage
      cheese, cream cheese, butter (salted + unsalted). List now ~40 foods. Covers the
      user's real breakfast (Mexican cheese eggs + bagel).
- [ ] **Day 2 — Cheeses & dairy extras:** Mexican blend shredded, cheddar, mozzarella,
      parmesan, cottage cheese, butter, cream cheese
- [ ] **Day 3 — More proteins:** turkey breast, pork chop, canned tuna, shrimp, tofu,
      bacon, ground turkey
- [ ] **Day 4 — More carbs & grains:** brown rice, quinoa, pasta, whole wheat pasta,
      potato, flour tortilla, corn tortilla, english muffin
- [ ] **Day 5 — Vegetables:** bell pepper, onion, tomato, carrot, green beans,
      asparagus, mushrooms, kale
- [ ] **Day 6 — Fruits & nuts:** apple, blueberries, strawberries, orange, walnuts,
      cashews, peanuts, chia seeds
- [ ] **Day 7 — Condiments, fats & misc:** honey, maple syrup, ketchup, mayo, salsa,
      coconut oil, dark chocolate

Notes: reorder by what the user eats MOST (front-load daily-breakfast items like
cheese/bagels). Each day ≈ 20-30 min. Future convenience: a simple "add a food" tool
(name + fdcId + portions, no code edit) to make gap-filling easier — but NOT a system
that bulk-adds for volume.

---

## 5. Tech Stack & Key Decisions

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + Tailwind on Vercel | served at mise.fit |
| Backend | FastAPI (Python) on Railway | service still internally named "bulkup" (invisible to users) |
| Database | PostgreSQL on Supabase | connect via pooler string (port 6543); plain-alphanumeric DB password to avoid URL-encoding issues |
| Auth | Custom JWT (passlib + bcrypt 4.0.1, pinned) | 7-day tokens; token stored in localStorage as `mise_token` |
| Wearable | Whoop API (OAuth) | energy returned in kilojoules → divide by 4.184 for kcal; redirect URI = https://mise.fit/whoop/callback |
| Nutrition data | USDA FoodData Central | live API now → local dataset later (see roadmap) |

**Decisions deliberately deferred (don't build yet):**
- AWS/Azure migration — overkill until ~$30k+ MRR; Railway/Vercel/Supabase fine for now
- Admin UI for tags — edit in code/DB instead; revisit only if it becomes painful
- User-created tags — avoided to keep tag data clean
- Free-form "what I ate" text parsing — too error-prone; structured ingredient entry only
- Native mobile app — web-first (PWA) for now; native later, iOS-first eventually
- Smart-scale auto weight sync — manual weight entry first; API scales (Withings etc.) later

**Hard rules learned:**
- Never put real personal passwords in test forms
- Never copy proprietary databases (e.g. MyFitnessPal); USDA is public-domain & safe
- Both sides of any OAuth redirect URI must match exactly (app env var + provider dashboard)

---

## 6. Open Questions / Future Decisions

- **Pricing** — hypothesis was ~$9.99/mo or ~$59.99/yr (undercutting a $25/mo competitor),
  but pricing should be decided with real users, not in a vacuum. Premium positioning
  (Whoop data, curation) may justify *not* racing to the bottom. **Decide later, with data.**
- **Local USDA dataset scope** — which subset of foods to store when migrating from API
  to local. Decide based on actual user search data.
- **Photo sourcing strategy** — how preloaded library meals get images, and whether/how
  users add their own.
- **Allergy-safety logic** — restriction tags are flagged as a distinct type now;
  future logic could hard-filter meals against a user's allergies.

---

## 7. Working Style (for sessions with an AI assistant)

- One step at a time — single action, verify, then next. No multi-step walls.
- Plain English; define jargon. Beginner-to-web-dev with Python/SQL background.
- Diagnose with the real error (logs/console) before proposing fixes — don't guess.
- Code changes are written as scoped prompts to paste into Claude Code in VS Code.
- Deploy via `git add . && git commit -m "..." && git push`.
- Be honest — flag risky, overcomplicated, or time-wasting moves directly.

---

## 8. Milestone Log

- Project scaffolded; deployed full stack (Vercel + Railway + Supabase)
- Whoop OAuth integration working (real calorie burn)
- Rebrand: BulkUp → Mise; domain mise.fit; navy + cream palette; logo
- Database migrated from Railway Postgres → Supabase
- Auth system complete (signup/login/logout/route protection/per-user data)
- Add-meal feature (in-app popup form)
- Tagging system (25 tags, 3 types) — backend + UI, verified
- Three-tier meal display — built & verified
- **→ Currently starting: USDA ingredient-driven nutrition (live API first)**
