# Mise — Project Document

> **Living document.** This is the single source of truth for what Mise is, why it
> exists, what's built, and where it's going. Update it as decisions are made and
> features ship. If starting a fresh conversation, hand over this file to get back
> up to speed quickly.

_Last updated: May 2026_

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

- [ ] **Day 1 — Breads & bagels:** plain bagel, egg bagel, everything bagel, whole
      wheat bagel, white bread, whole wheat bread, sourdough, multigrain
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
