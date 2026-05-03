import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import type { Post } from '../../core/models/post.model';
import { AppStore } from '../../core/store/app.store';
import { PostDialogComponent } from '../../shared/dialog/post-dialog.component';
import { VirtualScrollerComponent } from '../../shared/virtual-scroller/virtual-scroller.component';
import { PostsHeaderComponent } from './posts-header.component';
import { PostListItemComponent } from './post-list-item.component';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [
    PostsHeaderComponent,
    VirtualScrollerComponent,
    PostListItemComponent,
    PostDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="posts-col" aria-label="Posts">
      <app-posts-header />
      <div class="scroll-wrap" role="list" aria-label="Post list">
        @if (posts().length === 0) {
          <p class="empty" role="status">No posts match the current filters.</p>
        } @else {
          <app-virtual-scroller
            #vs
            class="list-viewport"
            [items]="posts()"
            [trackBy]="trackPost"
            [estimateItemHeight]="140"
            [overscan]="8"
          >
            <ng-template let-post let-index="index">
              <app-post-list-item
                [post]="post"
                [index]="index"
                [author]="userById().get(post.userId)"
                [focused]="index === focusedIndex()"
                (pick)="openDialog($event)"
                (moveFocus)="onMoveFocus($event)"
                (activate)="openDialog($event)"
              />
            </ng-template>
          </app-virtual-scroller>
        }
      </div>
    </section>
    <app-post-dialog
      [open]="dialogOpen()"
      [post]="dialogPost()"
      [author]="dialogAuthor()"
      (close)="closeDialog()"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: var(--surface, #fff);
    }
    .posts-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .scroll-wrap {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 0 0.75rem 0.75rem;
    }
    .list-viewport {
      flex: 1;
      min-height: 0;
    }
    .empty {
      margin: 2rem 0.5rem;
      text-align: center;
      color: var(--muted, #64748b);
      font-size: 0.95rem;
    }
  `,
})
export class PostsListComponent {
  private readonly store = inject(AppStore);

  private readonly vs = viewChild<VirtualScrollerComponent<Post>>('vs');

  protected readonly posts = computed(() => this.store.filteredSortedPosts());
  protected readonly userById = computed(() => this.store.userById());

  protected readonly focusedIndex = signal(0);

  protected readonly dialogOpen = signal(false);
  protected readonly dialogPost = signal<Post | null>(null);

  protected readonly dialogAuthor = computed(() => {
    const p = this.dialogPost();
    if (!p) {
      return undefined;
    }
    return this.userById().get(p.userId);
  });

  protected readonly trackPost = (p: Post, _i: number): number => p.id;

  constructor() {
    effect(() => {
      const len = this.posts().length;
      const cur = this.focusedIndex();
      if (len === 0) {
        this.focusedIndex.set(0);
        return;
      }
      if (cur > len - 1) {
        this.focusedIndex.set(len - 1);
      }
    });

    effect(() => {
      const len = this.posts().length;
      void len;
      queueMicrotask(() => this.vs()?.clampScrollTop());
    });
  }

  openDialog(post: Post): void {
    this.dialogPost.set(post);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  onMoveFocus(delta: -1 | 1): void {
    const len = this.posts().length;
    if (len === 0) {
      return;
    }
    const next = Math.min(len - 1, Math.max(0, this.focusedIndex() + delta));
    if (next === this.focusedIndex()) {
      return;
    }
    this.focusedIndex.set(next);
    const vs = this.vs();
    if (vs) {
      vs.scrollToIndex(next, 'smooth');
      queueMicrotask(() => this.focusPostButton(next));
    }
  }

  private focusPostButton(index: number): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = this.vs()?.getViewportElement();
        const btn = root?.querySelector<HTMLButtonElement>(`[data-post-index="${index}"]`);
        btn?.focus();
      });
    });
  }
}
