import { effect, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import type { PostSortMode } from '../models/sort-mode';
import { AppStore } from './app.store';

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

function parseUserIds(csv: string | undefined): Set<number> {
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

function normalizeQueryParams(params: Params): { users: string; search: string; sort: PostSortMode } {
  const users = typeof params['users'] === 'string' ? params['users'] : '';
  const search = typeof params['search'] === 'string' ? params['search'] : '';
  const sortRaw = typeof params['sort'] === 'string' ? params['sort'] : '';
  const sort: PostSortMode = sortRaw === 'title' ? 'title' : 'recent';
  return { users, search, sort };
}

@Injectable({ providedIn: 'root' })
export class UrlStateSyncService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(AppStore);

  /** Prevents feedback loops between router emissions and store-driven navigation. */
  private syncingFromRouter = false;

  constructor() {
    this.route.queryParams
      .pipe(
        map((p) => normalizeQueryParams(p)),
        distinctUntilChanged(
          (a, b) => a.users === b.users && a.search === b.search && a.sort === b.sort,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        const parsed = parseUserIds(q.users || undefined);
        if (
          setsEqual(parsed, this.store.usersSelected()) &&
          q.search === this.store.postSearch() &&
          q.sort === this.store.sort()
        ) {
          return;
        }
        this.syncingFromRouter = true;
        try {
          this.store.applyFromQueryParams(q.users || undefined, q.search || undefined, q.sort);
        } finally {
          queueMicrotask(() => {
            this.syncingFromRouter = false;
          });
        }
      });

    effect(() => {
      const users = this.store.usersSelected();
      const search = this.store.postSearch();
      const sort = this.store.sort();
      const next = this.buildQueryParams(users, search, sort);
      const cur = normalizeQueryParams(this.route.snapshot.queryParams);

      if (this.syncingFromRouter) {
        return;
      }

      if (
        this.csvFromSet(users) === cur.users &&
        search === cur.search &&
        sort === cur.sort
      ) {
        return;
      }

      this.syncingFromRouter = true;
      void this.router
        .navigate([], {
          relativeTo: this.route,
          queryParams: next,
          replaceUrl: true,
        })
        .finally(() => {
          queueMicrotask(() => {
            this.syncingFromRouter = false;
          });
        });
    });
  }

  private csvFromSet(ids: ReadonlySet<number>): string {
    return [...ids]
      .sort((a, b) => a - b)
      .join(',');
  }

  private buildQueryParams(
    users: ReadonlySet<number>,
    search: string,
    sort: PostSortMode,
  ): Params {
    const usersCsv = this.csvFromSet(users);
    return {
      users: usersCsv || null,
      search: search.trim() || null,
      sort,
    };
  }
}
