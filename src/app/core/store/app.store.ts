import { computed, Injectable, signal } from '@angular/core';

import { filterAndSortPosts } from '../data/post-query';
import { generatePosts, generateUsers } from '../data/fake-data.generator';
import type { Post } from '../models/post.model';
import type { PostSortMode } from '../models/sort-mode';
import type { User } from '../models/user.model';

const USER_COUNT = 1000;
const POST_COUNT = 10_000;
const DATA_SEED = 42;

@Injectable({ providedIn: 'root' })
export class AppStore {
  /** Canonical user list (stable order by id). */
  readonly allUsers = signal<User[]>(generateUsers(USER_COUNT, DATA_SEED));

  /** Canonical post list (stable generation). */
  readonly allPosts = signal<Post[]>(generatePosts(POST_COUNT, USER_COUNT, DATA_SEED));

  readonly usersSelected = signal<ReadonlySet<number>>(new Set<number>());

  readonly postSearch = signal('');

  readonly sort = signal<PostSortMode>('recent');

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
    this.postSearch.set(value);
  }

  setSort(mode: PostSortMode): void {
    this.sort.set(mode);
  }

  /** Apply query params from the router without side effects. */
  applyFromQueryParams(usersCsv: string | undefined, search: string | undefined, sort: string | undefined): void {
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
    const s = sort === 'title' || sort === 'recent' ? sort : 'recent';
    this.sort.set(s);
  }
}
