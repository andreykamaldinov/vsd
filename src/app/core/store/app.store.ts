import { computed, Injectable, signal } from '@angular/core';

import { filterAndSortPosts } from '../data/post-query';
import { generatePosts, generateUsers } from '../data/fake-data.generator';
import type { Post } from '../models/post.model';
import { type PostSortMode, parseSortMode } from '../models/sort-mode';
import type { User } from '../models/user.model';

const USER_COUNT = 1000;
const POST_COUNT = 10_000;
const DATA_SEED = 42;

/**
 * URL-backed application state (requirements #10 / #11).
 * Query format: `?users=12,45,901&search=angular&sort=recent&post=42`
 * (`post` = id of the first visible post in the filtered list; updates while scrolling. Legacy: `lead`.)
 */
export interface AppUrlState {
  usersSelected: Set<number>;
  postSearch: string;
  sort: 'recent' | 'title';
}

@Injectable({ providedIn: 'root' })
export class AppStore {
  /** Canonical user list (stable order by id). */
  readonly allUsers = signal<User[]>(generateUsers(USER_COUNT, DATA_SEED));

  /** Canonical post list (stable generation). */
  readonly allPosts = signal<Post[]>(generatePosts(POST_COUNT, USER_COUNT, DATA_SEED));

  /** Selected user ids (empty = all users’ posts). Synced to/from `users` query param. */
  readonly usersSelected = signal<Set<number>>(new Set());

  /** Post title/body search. Synced to/from `search` query param. */
  readonly postSearch = signal('');

  /** Sort mode. Synced to/from `sort` query param. */
  readonly sort = signal<PostSortMode>('recent');

  /**
   * Id of the post intersecting the top of the posts viewport (updates on scroll).
   * Synced to/from the `post` query param (debounced in UrlStateSyncService). `0` = none.
   */
  readonly leadFirstVisiblePostId = signal(0);

  /**
   * When set, {@link PostsListComponent} scrolls so this post id is at the top (deep link / back).
   */
  readonly pendingScrollToLeadPostId = signal<number | null>(null);

  setLeadFirstVisiblePostId(id: number): void {
    const v = Math.max(0, Math.floor(id));
    if (this.leadFirstVisiblePostId() === v) {
      return;
    }
    this.leadFirstVisiblePostId.set(v);
  }

  clearPendingScrollToLeadPostId(): void {
    this.pendingScrollToLeadPostId.set(null);
  }

  readonly userById = computed(() => {
    const map = new Map<number, User>();
    for (const u of this.allUsers()) {
      map.set(u.id, u);
    }
    return map;
  });

  /** Memoized: only recomputes when posts, selection, search, or sort change — not on scroll. */
  readonly filteredSortedPosts = computed(() =>
    filterAndSortPosts(this.allPosts(), this.usersSelected(), this.postSearch(), this.sort()),
  );

  readonly totalPostCount = computed(() => this.allPosts().length);

  toggleUser(userId: number): void {
    const cur = this.usersSelected();
    const next = new Set(cur);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    this.usersSelected.set(next);
  }

  setUsersSelected(ids: ReadonlySet<number>): void {
    this.usersSelected.set(new Set(ids));
  }

  setPostSearch(value: string): void {
    if (this.postSearch() === value) {
      return;
    }
    this.postSearch.set(value);
  }

  setSort(mode: PostSortMode): void {
    if (this.sort() === mode) {
      return;
    }
    this.sort.set(mode);
  }

  /**
   * Hydrate URL-backed fields from the router (single source for parsing).
   * `sortRaw` is the raw `sort` query value before normalization.
   * When `leadPostIdFromUrl` is `undefined`, the `post` query param was omitted — first visible post id is not reset from the URL.
   */
  applyFromQueryParams(
    usersCsv: string | undefined,
    search: string | undefined,
    sortRaw: string | undefined,
    leadPostIdFromUrl?: number,
  ): void {
    const ids = new Set<number>();
    if (usersCsv) {
      for (const part of usersCsv.split(',')) {
        const n = Number(part.trim());
        if (Number.isInteger(n) && n > 0) {
          ids.add(n);
        }
      }
    }
    this.usersSelected.set(ids);
    this.postSearch.set(search ?? '');
    this.sort.set(parseSortMode(sortRaw));

    if (leadPostIdFromUrl !== undefined) {
      const id = Math.max(0, Math.floor(leadPostIdFromUrl));
      const prev = this.leadFirstVisiblePostId();
      this.setLeadFirstVisiblePostId(id);
      if (id > 0 && id !== prev) {
        this.pendingScrollToLeadPostId.set(id);
      }
    }
  }
}
