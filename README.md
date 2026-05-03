# Virtualized Scrolling Demo

Angular demo app: **1,000 users** and **10,000 posts** with a **custom variable-height virtual scroller** (no CDK / third-party virtual scroll), **signal-based store**, **URL-driven state**, and **keyboard-accessible** post navigation.

## Setup

```bash
npm install
npm start
```

- Dev server: [http://localhost:4200/](http://localhost:4200/)
- Production build:

```bash
npm run build
```

- Unit tests:

```bash
npm test
```

**Submission note:** Do not include `node_modules` in archives or submissions.

## Architecture

Feature-oriented layout under `src/app/`:

- **`core/models/`** — `User`, `Post`, `Comment`, sort type helpers.
- **`core/data/`** — Deterministic fake data (`mulberry32` seed) and pure **filter/sort** helpers (`post-query.ts`).
- **`core/store/`** — `AppStore` (signals: `usersSelected`, `postSearch`, `sort`) and **`UrlStateSyncService`** (router `queryParams` ↔ store, no UI logic).
- **`shared/virtual-scroller/`** — Reusable virtual list: prefix sums, measured heights, `ResizeObserver`, rAF scroll batching, `translateY` window.
- **`shared/dialog/`** — Accessible post detail modal with generated comments.
- **`features/users/`**, **`features/posts/`** — Lists, items, sticky headers.
- **`app.component.ts`** — Two-column shell (users ~320px, posts flex).

All components use **`ChangeDetectionStrategy.OnPush`**. Local state uses **signals**; search debouncing uses **RxJS** (`debounceTime` + `switchMap` noop for cancellation pattern). No NgRx, no impure pipes, no CDK virtual scroll.

## URL state

Query format (example):

```text
?users=12,45,901&search=angular&sort=recent
```

- **`users`** — Comma-separated user ids (multi-select). Omitted or empty means “no filter” (all users’ posts).
- **`search`** — Case-insensitive match on post **title** and **body** (debounced 200ms in the UI before updating store/URL).
- **`sort`** — `recent` (newest `createdAt` first) or `title` (locale-aware alphabetical).

Changing the UI updates the URL with **`replaceUrl: true`** (no full reload). Reloading restores selection, search, and sort.

## Custom virtual scroller

Component: `app-virtual-scroller`

- **Variable height:** default row height from `estimateItemHeight`; **actual** heights stored in a `Map` keyed by **`trackBy(item, index)`** output (stable across reorder/filter when ids are stable).
- **Layout:** inner “rail” height = sum of row heights; visible rows sit in an absolutely positioned **window** with **`transform: translate3d(0, offset, 0)`**.
- **Visible range:** **binary search** on prefix sums from `scrollTop` / viewport height; **`overscan`** extends the rendered window.
- **Scroll path:** `scroll` listener is **`passive: true`**; range updates run in **`requestAnimationFrame`**. Height changes from **`ResizeObserver`** coalesce in rAF before rebuilding prefix sums.
- **List changes:** when `items` changes, the cache is **pruned** to current keys; prefix array is rebuilt; scroll top is **clamped** to valid range.

### Tradeoffs / limitations

- **Very large height drift** (e.g. images loading late without remeasure) can still cause minor scroll jumps until `ResizeObserver` fires.
- **ARIA listbox** with virtualization only exposes **rendered** options in the DOM; this is a common limitation of windowed lists (focus management mitigates posts via roving `tabindex` on the focused index).
- Prefix rebuild is **O(n)** on full list when many heights change at once; for 10k rows this stays acceptable when batched outside the scroll hot path.

## Performance choices

- **No filtering/sorting in scroll handlers** — `filteredSortedPosts` is a **`computed`** signal over store inputs.
- **Passive scrolling** + **rAF** for viewport math.
- **Small DOM** — only visible rows + overscan are instantiated; `trackBy` limits churn when the window moves.
- **Deterministic data** — stable seeds for reproducible profiling and Lighthouse runs.

Target: smooth **60fps** scroll on desktop; Lighthouse performance depends on machine and Chrome version—this stack is tuned for a **90+** desktop score under typical conditions.

## Tests

`npm test` covers:

- Post filtering, search, and sort (pure functions).
- Store query-param hydration (`applyFromQueryParams`).
- Router-driven restore via `UrlStateSyncService` + `AppStore`.
- App bootstraps with router providers.

---

Generated with Angular CLI 21; TypeScript **strict** mode enabled in `tsconfig.json`.
