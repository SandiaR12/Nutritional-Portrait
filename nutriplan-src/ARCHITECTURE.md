# NutriPlan — Architecture Document
*Staff-level refactoring analysis*

## Repository inventory (before refactor)

| File | Size | Status |
|------|------|--------|
| patient-view.html | 858 KB | ✅ Active — everything embedded |
| admin.html | 12 KB | ✅ Active |
| admin-app.js | 18 KB | ✅ Active |
| admin-styles.css | 9.6 KB | ✅ Active |
| firebase.js | 950 B | ✅ Active (admin only) |
| patient-styles.css | 19 KB | ❌ Dead — never linked |
| patient-view.css | 21 KB | ❌ Dead — never linked |
| patient-app.js | 13 KB | ❌ Dead — never linked |
| patient-view.js | 80 B | ❌ Dead — just a comment |
| index.html | 858 KB | ⚠️ Exact duplicate of patient-view.html |
| calculadora-libre.html | 713 KB | ⚠️ Standalone monolith |
| calculadora-paciente.html | 529 KB | ⚠️ Standalone monolith |

**Dead weight:** 53 KB of orphan files + 858 KB exact duplicate

---

## Structural problems identified

### 1. Monolithic single-file (858 KB)
Everything — 730 KB of food database JSON, 40 KB CSS,
64 KB of application logic — embedded in one HTML file.
**Risk:** Impossible to test, diff, or maintain in isolation.
**Refactor:** Separate data / logic / styles into modules (see /src/)

### 2. Four normalise functions doing the same thing
- `norm()` — arrow function
- `normEx()` — identical function, different name
- `normalize()` — inside recommendation engine
- `unify()` inline normalize — inside norm_food()
**Fix applied:** Removed `normEx`, routed all calls through `norm()`.

### 3. renderCal() recreates 15 DOM nodes on every state change
Called 8× per user interaction (toggle meal, add food, delete entry).
Each call: `innerHTML=''` + 15 `createElement` + 15 `appendChild`.
**Fix applied:** Incremental update — cells created once, className patched in-place.

### 4. Chart.js destroy+recreate on every analysis render
`destroy()` + `new Chart()` = full WebGL context rebuild every time a food is added.
On low-end phones this causes visible jank.
**Fix applied:** `chart.data.datasets[0].data = newData; chart.update('none')` — zero layout thrash.

### 5. Firestore write-storm on rapid taps
Every `toggleMeal` click fired an immediate `await setDoc(...)`.
Tapping 5 checkboxes fast = 5 sequential writes, each awaited.
**Fix applied:** `writeSoon(collection, data, 400ms)` — debounced write, last tap wins.

### 6. Recommendation engine: O(n) scan on every filter change
2,831 foods × scoring function = ~8,000 operations per filter tab tap.
No caching — same result recomputed even when nothing changed.
**Fix applied:** Memoize by deficit signature `[rem.k|rem.p|rem.c|rem.l|meal|filter]`.
Cache hit = instant, zero work. Invalidated on log change.

### 7. `will-change: transform` on calendar cells
`will-change` promotes each cell to its own GPU compositing layer.
15 cells × promoted layer = 15 extra compositor textures held in VRAM.
**Fix applied:** `contain: layout style` — browser containment without layer promotion.

---

## Proposed modular architecture (see /src/)

```
nutriplan-src/
├── core/
│   ├── db.js           — Firebase singleton + writeSoon() debounce
│   ├── state.js        — Single mutable state object + typed accessors
│   └── search.js       — Unified fuzzy search + food normalisation
├── features/
│   ├── ui.js           — All DOM render functions (pure: state → DOM)
│   └── recommendations.js — Nutrition engine (scoring, quality, memoize)
└── data/               — MEGA.json, SMAE.json, FOODS_EX.json (separate)
```

**Benefits of this structure:**
- Each module has a single responsibility
- `core/state.js` eliminates scattered globals (`curDay`, `pat`, `prog`, `logs`)
- `core/search.js` is the only place normalisation happens
- `features/ui.js` functions are pure — same state always produces same DOM
- `features/recommendations.js` is independently testable
- Data files can be lazy-loaded / cached by service worker
