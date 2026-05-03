import { effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { type PostSortMode, parseSortMode } from '../models/sort-mode';
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
    private readonly syncingFromRouter = signal(false);

    public constructor() {
        const read = (): QuerySnapshot => this.snapshotFromLocation();
        const apply = (q: QuerySnapshot): void => {
            this.store.applyFromQueryParams(q.users, q.search, q.sort);
        };

        apply(read());

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                map(read),
                distinctUntilChanged(UrlStateSyncService.sameSnapshot),
                takeUntilDestroyed()
            )
            .subscribe((q) => {
                if (!this.syncingFromRouter()) {
                    apply(q);
                }
            });

        effect(() => {
            this.store.usersSelected();
            this.store.postSearch();
            this.store.sort();
            if (!this.syncingFromRouter()) {
                this.pushWhenDrifted();
            }
        });
    }

    private pushWhenDrifted(): void {
        const cur = this.snapshotFromLocation();
        const next = this.storeSnapshot();
        if (UrlStateSyncService.sameSnapshot(cur, next)) {
            return;
        }
        this.syncingFromRouter.set(true);
        void this.router
            .navigateByUrl(
                this.router.createUrlTree(['/'], {
                    queryParams: UrlStateSyncService.toParams(next),
                    queryParamsHandling: '',
                }),
                { replaceUrl: true }
            )
            .finally(() => {
                queueMicrotask(() => {
                    this.syncingFromRouter.set(false);
                });
            });
    }

    private snapshotFromLocation(): QuerySnapshot {
        return UrlStateSyncService.parseQuery(this.browserQueryParams());
    }

    private browserQueryParams(): Params {
        const q = this.router.parseUrl(this.router.url).queryParams;
        const w = globalThis.window;
        if (
            typeof w !== 'undefined' &&
            w.location.search.length > 0 &&
            Object.keys(q).length === 0
        ) {
            return this.router.parseUrl(`${w.location.pathname}${w.location.search}`).queryParams;
        }
        return q;
    }

    private storeSnapshot(): QuerySnapshot {
        return {
            users: UrlStateSyncService.joinUserIds(this.store.usersSelected()),
            search: this.store.postSearch(),
            sort: this.store.sort(),
        };
    }

    private static joinUserIds(ids: ReadonlySet<number>): string {
        return [...ids].sort((a, b) => a - b).join(',');
    }

    private static usersCsvKey(csv: string): string {
        const ids = new Set<number>();
        if (csv) {
            for (const part of csv.split(',')) {
                const n = Number(part.trim());
                if (Number.isInteger(n) && n > 0) {
                    ids.add(n);
                }
            }
        }
        return UrlStateSyncService.joinUserIds(ids);
    }

    private static str(params: Params, key: string): string {
        const v = params[key];
        return typeof v === 'string' ? v : '';
    }

    private static parseQuery(params: Params): QuerySnapshot {
        return {
            users: UrlStateSyncService.str(params, 'users'),
            search: UrlStateSyncService.str(params, 'search'),
            sort: parseSortMode(UrlStateSyncService.str(params, 'sort')),
        };
    }

    private static sameSnapshot(a: QuerySnapshot, b: QuerySnapshot): boolean {
        return (
            UrlStateSyncService.usersCsvKey(a.users) === UrlStateSyncService.usersCsvKey(b.users) &&
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
