import { effect, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { type PostSortMode, parseSortMode } from '../models/sort-mode';
import { AppStore } from './app.store';

const LEAD_URL_DEBOUNCE_MS = 220;

function setsEqual(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function parseUserIdsFromCsv(csv: string | undefined): Set<number> {
  const ids = new Set<number>();
  if (!csv) {
    return ids;
  }
  for (const part of csv.split(',')) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n > 0) {
      ids.add(n);
    }
  }
  return ids;
}

export type NormalizedQuery = {
  users: string;
  search: string;
  sort: PostSortMode;
  sortParam: string;
  hasFirstVisiblePostInUrl: boolean;
  /** First visible post id from `post` (legacy: `lead`). */
  firstVisiblePostId: number;
};

function normalizeQueryParams(params: Params): NormalizedQuery {
  const users = typeof params['users'] === 'string' ? params['users'] : '';
  const search = typeof params['search'] === 'string' ? params['search'] : '';
  const sortParam = typeof params['sort'] === 'string' ? params['sort'] : '';
  const sort = parseSortMode(sortParam);
  const postRaw = params['post'] ?? params['lead'];
  const hasFirstVisiblePostInUrl = typeof postRaw === 'string';
  const firstVisiblePostId = hasFirstVisiblePostInUrl
    ? Math.max(0, Math.floor(Number(postRaw)) || 0)
    : 0;
  return { users, search, sort, sortParam, hasFirstVisiblePostInUrl, firstVisiblePostId };
}

function normalizedQueryEqual(a: NormalizedQuery, b: NormalizedQuery): boolean {
  return (
    a.users === b.users &&
    a.search === b.search &&
    a.sort === b.sort &&
    a.hasFirstVisiblePostInUrl === b.hasFirstVisiblePostInUrl &&
    (!a.hasFirstVisiblePostInUrl || a.firstVisiblePostId === b.firstVisiblePostId)
  );
}

/**
 * Keeps {@link AppStore} URL-backed fields in sync with the address bar.
 * Uses {@link Router#createUrlTree} + {@link Router#navigateByUrl} so query updates work
 * reliably with the shell + default route layout.
 */
@Injectable({ providedIn: 'root' })
export class UrlStateSyncService {
  private readonly router = inject(Router);
  private readonly store = inject(AppStore);

  /** Prevents feedback loops between router emissions and store-driven navigation. */
  private syncingFromRouter = false;

  private leadDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const readFromLocationBar = (): NormalizedQuery =>
      normalizeQueryParams(this.parseCurrentQueryParamsFromLocation());

    const applyFromQueryIfNeeded = (q: NormalizedQuery): void => {
      const parsed = parseUserIdsFromCsv(q.users || undefined);
      const postOk =
        !q.hasFirstVisiblePostInUrl ||
        q.firstVisiblePostId === this.store.leadFirstVisiblePostId();
      if (
        setsEqual(parsed, this.store.usersSelected()) &&
        q.search === this.store.postSearch() &&
        q.sort === this.store.sort() &&
        postOk
      ) {
        return;
      }
      this.syncingFromRouter = true;
      try {
        if (q.hasFirstVisiblePostInUrl) {
          this.store.applyFromQueryParams(
            q.users || undefined,
            q.search || undefined,
            q.sortParam || undefined,
            q.firstVisiblePostId,
          );
        } else {
          this.store.applyFromQueryParams(q.users || undefined, q.search || undefined, q.sortParam || undefined);
        }
      } finally {
        queueMicrotask(() => {
          this.syncingFromRouter = false;
        });
      }
    };

    applyFromQueryIfNeeded(readFromLocationBar());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => readFromLocationBar()),
        distinctUntilChanged((a, b) => normalizedQueryEqual(a, b)),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (this.syncingFromRouter) {
          return;
        }
        applyFromQueryIfNeeded(q);
      });

    const pushIfDrift = (immediate: boolean): void => {
      const run = (): void => {
        if (this.syncingFromRouter) {
          return;
        }
        const cur = readFromLocationBar();
        const nextSnap = this.snapshotFromStore();
        if (normalizedQueryEqual(cur, nextSnap)) {
          return;
        }
        this.syncingFromRouter = true;
        const tree = this.router.createUrlTree(['/'], {
          queryParams: this.buildQueryParamsFromSnapshot(nextSnap),
          queryParamsHandling: '',
        });
        void this.router.navigateByUrl(tree, { replaceUrl: true }).finally(() => {
          queueMicrotask(() => {
            this.syncingFromRouter = false;
          });
        });
      };

      if (immediate) {
        if (this.leadDebounceTimer !== null) {
          clearTimeout(this.leadDebounceTimer);
          this.leadDebounceTimer = null;
        }
        run();
        return;
      }

      if (this.leadDebounceTimer !== null) {
        clearTimeout(this.leadDebounceTimer);
      }
      this.leadDebounceTimer = setTimeout(() => {
        this.leadDebounceTimer = null;
        run();
      }, LEAD_URL_DEBOUNCE_MS);
    };

    // users / search / sort → update URL immediately (include current `post` when set).
    effect(() => {
      const users = this.store.usersSelected();
      const search = this.store.postSearch();
      const sort = this.store.sort();
      void users, search, sort;
      if (this.syncingFromRouter) {
        return;
      }
      pushIfDrift(true);
    });

    // First visible post id (`post` in URL) → debounced URL updates.
    effect(() => {
      const postId = this.store.leadFirstVisiblePostId();
      void postId;
      if (this.syncingFromRouter) {
        return;
      }
      pushIfDrift(false);
    });
  }

  private snapshotFromStore(): NormalizedQuery {
    const users = this.csvFromSet(this.store.usersSelected());
    const search = this.store.postSearch();
    const sort = this.store.sort();
    const postId = this.store.leadFirstVisiblePostId();
    const hasFirstVisiblePostInUrl = postId > 0;
    return {
      users,
      search,
      sort,
      sortParam: sort,
      hasFirstVisiblePostInUrl,
      firstVisiblePostId: postId,
    };
  }

  private buildQueryParamsFromSnapshot(s: NormalizedQuery): Params {
    return {
      users: s.users || null,
      search: s.search.trim() || null,
      sort: s.sort,
      post: s.hasFirstVisiblePostInUrl ? String(s.firstVisiblePostId) : null,
      lead: null,
    };
  }

  /**
   * On hard reload, the router snapshot can be empty while `location.search` already
   * has the deep link. Otherwise trust {@link Router#url} (it updates before `window`
   * after `navigateByUrl`).
   */
  private parseCurrentQueryParamsFromLocation(): Params {
    const routerParams = this.router.parseUrl(this.router.url).queryParams;

    if (typeof window !== 'undefined' && window.location.search.length > 0) {
      const routerHasNoQuery = Object.keys(routerParams).length === 0;
      if (routerHasNoQuery) {
        const fromWindow = `${window.location.pathname}${window.location.search}`;
        return this.router.parseUrl(fromWindow).queryParams;
      }
    }

    return routerParams;
  }

  private csvFromSet(ids: ReadonlySet<number>): string {
    return [...ids]
      .sort((a, b) => a - b)
      .join(',');
  }
}
