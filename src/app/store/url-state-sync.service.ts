import { effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Params, Router } from '@angular/router';
import { filter, map, distinctUntilChanged } from 'rxjs';
import { type PostSortMode, parseSortMode } from '../shared/models/sort-mode';
import { AppStore } from './app.store';

interface QuerySnapshot {
    users: string;
    search: string;
    sort: PostSortMode;
}

@Injectable({ providedIn: 'root' })
export class UrlStateSyncService {
    private readonly router = inject(Router);
    private readonly store = inject(AppStore);

    private readonly syncing = signal(false);

    public constructor() {
        this.apply(this.read());

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                map(() => this.read()),
                distinctUntilChanged((a, b) => UrlStateSyncService.same(a, b))
            )
            .subscribe((q) => {
                if (this.syncing()) {
                    return;
                }
                this.apply(q);
            });

        effect(() => {
            const next = this.storeSnapshot();

            if (this.syncing()) {
                return;
            }

            const current = this.read();

            if (UrlStateSyncService.same(current, next)) {
                return;
            }

            this.syncing.set(true);

            this.router
                .navigate([], {
                    queryParams: UrlStateSyncService.toParams(next),
                    replaceUrl: true,
                })
                .finally(() => {
                    queueMicrotask(() => this.syncing.set(false));
                });
        });
    }

    private apply(q: QuerySnapshot): void {
        this.store.applyFromQueryParams(q.users, q.search, q.sort);
    }

    private read(): QuerySnapshot {
        const params = this.router.parseUrl(this.router.url).queryParams;

        return {
            users: this.str(params, 'users'),
            search: this.str(params, 'search'),
            sort: parseSortMode(this.str(params, 'sort')),
        };
    }

    private storeSnapshot(): QuerySnapshot {
        return {
            users: UrlStateSyncService.join(this.store.usersSelected()),
            search: this.store.postSearch(),
            sort: this.store.sort(),
        };
    }

    private str(params: Params, key: string): string {
        const v = params[key];
        return typeof v === 'string' ? v : '';
    }

    private static join(ids: ReadonlySet<number>): string {
        return [...ids].sort((a, b) => a - b).join(',');
    }

    private static normalizeUsers(csv: string): string {
        const ids = new Set<number>();

        for (const part of csv.split(',')) {
            const n = Number(part.trim());
            if (Number.isInteger(n) && n > 0) {
                ids.add(n);
            }
        }

        return this.join(ids);
    }

    private static same(a: QuerySnapshot, b: QuerySnapshot): boolean {
        return (
            this.normalizeUsers(a.users) === this.normalizeUsers(b.users) &&
            a.search.trim() === b.search.trim() &&
            a.sort === b.sort
        );
    }

    private static toParams(s: QuerySnapshot): Params {
        return {
            users: s.users || null,
            search: s.search.trim() || null,
            sort: s.sort,
        };
    }
}
