import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppStore } from '../../../core/store/app.store';

@Component({
  selector: 'app-posts-header',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './posts-header.component.html',
  styleUrl: './posts-header.component.scss',
})
export class PostsHeaderComponent {
  readonly store = inject(AppStore);

  /** Furthest exclusive end index reached in the filtered list (header “Showing X …”). */
  readonly shownPostsCount = input(0);
  /** Length of the filtered/sorted post list. */
  readonly filteredPostsTotal = input(0);

  protected readonly draft = signal('');

  protected readonly scrollPositionLine = computed(() => {
    const fmt = (n: number) => n.toLocaleString('en-US');
    const total = this.filteredPostsTotal();
    if (total === 0) {
      return `Showing 0 of ${fmt(0)} posts`;
    }
    const shown = Math.min(total, Math.max(0, this.shownPostsCount()));
    return `Showing ${fmt(shown)} of ${fmt(total)} posts`;
  });

  constructor() {
    effect(() => {
      this.draft.set(this.store.postSearch());
    });
  }

  onSearchInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.draft.set(v);
    this.store.setPostSearch(v);
  }

  onSort(mode: string): void {
    this.store.setSort(mode === 'title' ? 'title' : 'recent');
  }
}
