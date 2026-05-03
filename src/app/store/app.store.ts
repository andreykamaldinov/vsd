import { computed, Injectable, signal } from '@angular/core';

import { filterAndSortPosts } from '../shared/data/post-query';
import { generatePosts, generateUsers } from '../shared/data/fake-data.generator';
import type { Post } from '../shared/models/post.model';
import { type PostSortMode } from '../shared/models/sort-mode';
import type { User } from '../shared/models/user.model';

const USER_COUNT = 1000;
const POST_COUNT = 10_000;
const DATA_SEED = 42;

@Injectable({ providedIn: 'root' })
export class AppStore {
    public readonly allUsers = signal<User[]>(generateUsers(USER_COUNT, DATA_SEED));
    public readonly allPosts = signal<Post[]>(generatePosts(POST_COUNT, USER_COUNT, DATA_SEED));
    public readonly usersSelected = signal<Set<number>>(new Set());
    public readonly postSearch = signal('');
    public readonly sort = signal<PostSortMode>('recent');
    public readonly leadFirstVisiblePostId = signal(0);

    public readonly userById = computed(() => {
        const map = new Map<number, User>();
        for (const u of this.allUsers()) {
            map.set(u.id, u);
        }
        return map;
    });

    public readonly filteredSortedPosts = computed(() =>
        filterAndSortPosts(this.allPosts(), this.usersSelected(), this.postSearch(), this.sort())
    );

    public setLeadFirstVisiblePostId(id: number): void {
        const v = Math.max(0, Math.floor(id));
        if (this.leadFirstVisiblePostId() === v) {
            return;
        }
        this.leadFirstVisiblePostId.set(v);
    }

    public toggleUser(userId: number): void {
        const cur = this.usersSelected();
        const next = new Set(cur);

        if (next.has(userId)) {
            next.delete(userId);
        } else {
            next.add(userId);
        }
        this.usersSelected.set(next);
    }

    public setPostSearch(value: string): void {
        if (this.postSearch() === value) {
            return;
        }
        this.postSearch.set(value);
    }

    public setSort(mode: PostSortMode): void {
        if (this.sort() === mode) {
            return;
        }
        this.sort.set(mode);
    }

    public applyFromQueryParams(
        usersCsv: string | undefined,
        search: string | undefined,
        sortRaw: PostSortMode,
        leadPostIdFromUrl?: number
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
        const nextSearch = search ?? '';

        this.usersSelected.set(ids);
        this.postSearch.set(nextSearch);
        this.sort.set(sortRaw);

        if (leadPostIdFromUrl != null) {
            const id = Math.max(0, Math.floor(leadPostIdFromUrl));
            this.setLeadFirstVisiblePostId(id);
        }
    }
}
