import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';

import { AppStore } from '../../core/store/app.store';

@Component({
  selector: 'app-posts-header',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky-head" aria-label="Posts filters">
      <div class="row title-row">
        <h2>Posts</h2>
        <p class="sub">{{ filteredLabelText() }}</p>
      </div>
      <div class="controls">
        <label class="sr-only" for="post-search">Search posts</label>
        <input
          id="post-search"
          type="search"
          class="search"
          placeholder="Search title or body…"
          autocomplete="off"
          [value]="draft()"
          (input)="onSearchInput($event)"
        />
        <label class="sr-only" for="post-sort">Sort posts</label>
        <select
          id="post-sort"
          class="sort"
          [ngModel]="store.sort()"
          (ngModelChange)="onSort($event)"
        >
          <option value="recent">Recent</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }
    .sticky-head {
      position: sticky;
      top: 0;
      z-index: 3;
      padding: 0.85rem 1rem;
      background: color-mix(in srgb, var(--surface, #fff) 92%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .title-row {
      margin-bottom: 0.65rem;
    }
    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .sub {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: var(--muted, #64748b);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .search {
      flex: 1 1 180px;
      min-width: 0;
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border, #e2e8f0);
      font: inherit;
    }
    .search:focus-visible {
      outline: 2px solid var(--ring, #2563eb);
      outline-offset: 2px;
    }
    .sort {
      flex: none;
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      border: 1px solid var(--border, #e2e8f0);
      font: inherit;
      background: var(--surface, #fff);
    }
    .sort:focus-visible {
      outline: 2px solid var(--ring, #2563eb);
      outline-offset: 2px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `,
})
export class PostsHeaderComponent {
  readonly store = inject(AppStore);

  private readonly search$ = new Subject<string>();

  protected readonly draft = signal('');

  protected readonly filteredLabelText = computed(() => {
    const n = this.store.filteredSortedPosts().length;
    const total = this.store.totalPostCount();
    return `Showing ${n.toLocaleString()} of ${total.toLocaleString()} posts`;
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => of(q)),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.store.setPostSearch(q));

    effect(() => {
      this.draft.set(this.store.postSearch());
    });
  }

  onSearchInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.draft.set(v);
    this.search$.next(v);
  }

  onSort(mode: string): void {
    this.store.setSort(mode === 'title' ? 'title' : 'recent');
  }
}
