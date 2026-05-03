import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import { AppStore } from '../../../core/store/app.store';
import { VirtualScrollerComponent } from '../../../shared/virtual-scroller/virtual-scroller.component';
import { PostDialogComponent } from '../post-dialog/post-dialog.component';
import { PostDialogService } from '../post-dialog/post-dialog.service';
import { PostListItemComponent } from '../post-list-item/post-list-item.component';
import { PostsHeaderComponent } from '../posts-header/posts-header.component';

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
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.scss',
})
export class PostsListComponent {
  private readonly store = inject(AppStore);
  private readonly postDialog = inject(PostDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly vs = viewChild<VirtualScrollerComponent<Post>>('vs');

  protected readonly posts = computed(() => this.store.filteredSortedPosts());
  protected readonly userById = computed(() => this.store.userById());

  /**
   * Cumulative maximum **exclusive** end index of the virtual window for the current filtered list
   * (`max` over `renderedRangeChange.end`). Does not shrink when scrolling up; resets when filters/sort/search/list change.
   */
  protected readonly maxReachedPostEndIndex = signal(0);

  /** `X` in “Showing X of Y posts” — furthest absolute position reached in the list (exclusive end), capped at length. */
  protected readonly shownPostsCount = computed(() => {
    const total = this.posts().length;
    const end = this.maxReachedPostEndIndex();
    return Math.max(0, Math.min(total, end));
  });

  /** Resets {@link maxReachedPostEndIndex} when the effective result set changes (not when only scrolling / URL lead updates). */
  private listProgressFingerprint = '';

  protected readonly focusedIndex = signal(0);

  /** Briefly ignore viewport-top sync of `focusedIndex` while keyboard moves focus in the posts list. */
  private keyboardPostsFocusLockTimer: number | undefined;

  /** Invalidates older `afterNextRender` lead-scroll callbacks so they cannot stack. */
  private leadScrollRenderGeneration = 0;

  /**
   * After URL restore, {@link onPostsVisibleRange} can run with a wrong `first` while prefix
   * heights still lag DOM — that would overwrite lead id, focus, and “selected” row. Block until
   * scroll alignment has settled across a few frames.
   */
  private blockVisibleRangeLeadSync = false;

  protected readonly trackPost = (p: Post, _i: number): number => p.id;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.keyboardPostsFocusLockTimer !== undefined) {
        window.clearTimeout(this.keyboardPostsFocusLockTimer);
      }
    });

    effect(() => {
      const list = this.posts();
      const sort = this.store.sort();
      const search = this.store.postSearch();
      const users = this.store.usersSelected();
      const n = list.length;
      const u = [...users].sort((a, b) => a - b).join(',');
      const head = n > 0 ? list[0]!.id : 0;
      const tail = n > 0 ? list[n - 1]!.id : 0;
      const fp = `${sort}\0${search}\0${u}\0${n}\0${head}\0${tail}`;
      if (fp !== this.listProgressFingerprint) {
        this.listProgressFingerprint = fp;
        this.maxReachedPostEndIndex.set(0);
      }
    });

    effect(() => {
      const len = this.posts().length;
      const cur = this.focusedIndex();
      if (len === 0) {
        this.focusedIndex.set(0);
        if (this.keyboardPostsFocusLockTimer !== undefined) {
          window.clearTimeout(this.keyboardPostsFocusLockTimer);
          this.keyboardPostsFocusLockTimer = undefined;
        }
        this.store.setLeadFirstVisiblePostId(0);
        return;
      }
      if (cur > len - 1) {
        this.focusedIndex.set(len - 1);
      }
    });

    effect(() => {
      const len = this.posts().length;
      const pending = this.store.pendingScrollToLeadPostId();
      void len;
      void pending;
      if (pending !== null) {
        return;
      }
      queueMicrotask(() => this.vs()?.clampScrollTop());
    });

    effect(() => {
      const pending = this.store.pendingScrollToLeadPostId();
      const posts = this.posts();
      if (pending === null || posts.length === 0) {
        return;
      }
      if (pending < 1) {
        this.store.clearPendingScrollToLeadPostId();
        return;
      }
      const idx = posts.findIndex((p) => p.id === pending);
      const startIndex = idx >= 0 ? idx : 0;
      const gen = ++this.leadScrollRenderGeneration;
      this.blockVisibleRangeLeadSync = true;
      afterNextRender(
        () => {
          if (gen !== this.leadScrollRenderGeneration) {
            return;
          }
          queueMicrotask(() => {
            if (gen !== this.leadScrollRenderGeneration) {
              return;
            }
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (gen !== this.leadScrollRenderGeneration) {
                  return;
                }
                const vs = this.vs();
                vs?.scrollToIndex(startIndex, 'start');
                const sel = `[data-vs-row-index="${startIndex}"]`;
                const finishRestore = (): void => {
                  if (gen !== this.leadScrollRenderGeneration) {
                    return;
                  }
                  vs?.releaseScrollStartPin();
                  this.store.clearPendingScrollToLeadPostId();
                  this.focusedIndex.set(startIndex);
                  this.focusPostButton(startIndex);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      if (gen !== this.leadScrollRenderGeneration) {
                        return;
                      }
                      this.blockVisibleRangeLeadSync = false;
                    });
                  });
                };
                requestAnimationFrame(() => {
                  if (gen !== this.leadScrollRenderGeneration) {
                    return;
                  }
                  vs?.correctViewportToSelectorTop(sel);
                  requestAnimationFrame(() => {
                    if (gen !== this.leadScrollRenderGeneration) {
                      return;
                    }
                    vs?.correctViewportToSelectorTop(sel);
                    requestAnimationFrame(() => {
                      if (gen !== this.leadScrollRenderGeneration) {
                        return;
                      }
                      vs?.correctViewportToSelectorTop(sel);
                      finishRestore();
                    });
                  });
                });
              });
            });
          });
        },
        { injector: this.injector },
      );
    });

    let wasDialogOpen = false;
    effect(() => {
      const isOpen = this.postDialog.isOpen();
      if (wasDialogOpen && !isOpen) {
        this.restoreFocusAfterDialogClose();
      }
      wasDialogOpen = isOpen;
    });
  }

  openDialog(post: Post): void {
    const list = this.posts();
    const idx = list.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      this.focusedIndex.set(idx);
      this.beginKeyboardPostsFocusLock();
      queueMicrotask(() => this.vs()?.scrollToIndex(idx, 'nearest', 'auto'));
    } else {
      this.beginKeyboardPostsFocusLock();
    }
    this.postDialog.open(post, this.userById().get(post.userId));
  }

  onMoveFocus(delta: -1 | 1): void {
    this.nudgeFocusedIndex(delta);
  }

  protected onPostsListKeydown(ev: KeyboardEvent): void {
    if ((ev.target as HTMLElement).closest('button.post-btn')) {
      return;
    }
    const len = this.posts().length;
    if (len === 0) {
      return;
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.nudgeFocusedIndex(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.nudgeFocusedIndex(-1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const p = this.posts()[this.focusedIndex()];
      if (p) {
        this.openDialog(p);
      }
    }
  }

  protected onPostsListMouseDown(ev: MouseEvent): void {
    if (this.posts().length === 0) {
      return;
    }
    if ((ev.target as HTMLElement).closest('button.post-btn')) {
      return;
    }
    this.focusPostButton(this.focusedIndex());
  }

  protected onRenderedRangeChange(ev: { start: number; end: number; count: number }): void {
    const len = this.posts().length;
    if (len === 0 || ev.end <= 0) {
      return;
    }
    this.maxReachedPostEndIndex.update((m) => Math.min(len, Math.max(m, ev.end)));
  }

  protected onPostsVisibleRange(ev: { start: number; end: number; count: number }): void {
    if (ev.end < 0) {
      return;
    }
    // Until URL/deep-link scroll runs, the viewport is still at scrollTop 0 — ignore stray ranges
    // so we do not overwrite `leadFirstVisiblePostId` with the first list item (wrong id in URL).
    if (this.store.pendingScrollToLeadPostId() !== null) {
      return;
    }
    if (this.blockVisibleRangeLeadSync) {
      return;
    }

    const list = this.posts();

    const topIdx = Math.min(Math.max(0, ev.start), list.length - 1);
    const top = list[topIdx];
    this.store.setLeadFirstVisiblePostId(top?.id ?? 0);

    if (this.keyboardPostsFocusLockTimer === undefined) {
      if (this.focusedIndex() !== topIdx) {
        this.focusedIndex.set(topIdx);
        this.refocusPostButtonIfInList(topIdx);
      }
      return;
    }

    const i = this.focusedIndex();
    if (i >= ev.start && i <= ev.end) {
      return;
    }
    this.focusedIndex.set(topIdx);
    this.refocusPostButtonIfInList(topIdx);
  }

  private beginKeyboardPostsFocusLock(): void {
    if (this.keyboardPostsFocusLockTimer !== undefined) {
      window.clearTimeout(this.keyboardPostsFocusLockTimer);
    }
    this.keyboardPostsFocusLockTimer = window.setTimeout(() => {
      this.keyboardPostsFocusLockTimer = undefined;
    }, 120);
  }

  private nudgeFocusedIndex(delta: -1 | 1): void {
    const len = this.posts().length;
    if (len === 0) {
      return;
    }
    const next = Math.min(len - 1, Math.max(0, this.focusedIndex() + delta));
    if (next === this.focusedIndex()) {
      return;
    }
    this.focusedIndex.set(next);
    this.beginKeyboardPostsFocusLock();
    queueMicrotask(() => {
      this.vs()?.scrollToIndex(next, 'nearest', 'smooth');
      this.focusPostButton(next);
    });
  }

  private refocusPostButtonIfInList(index: number): void {
    const ae = document.activeElement;
    if (
      ae instanceof HTMLElement &&
      ae.closest('.posts-col .scroll-wrap')?.contains(ae) &&
      ae.matches('button.post-btn')
    ) {
      queueMicrotask(() => this.focusPostButton(index));
    }
  }

  private focusPostButton(index: number): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = this.vs()?.getViewportElement();
        const btn = root?.querySelector<HTMLButtonElement>(`[data-post-index="${index}"]`);
        btn?.focus({ preventScroll: true });
      });
    });
  }

  private restoreFocusAfterDialogClose(): void {
    const idx = this.focusedIndex();
    if (this.posts().length === 0) {
      return;
    }
    const vs = this.vs();
    vs?.scrollToIndex(idx, 'nearest', 'auto');
    this.focusPostButton(idx);
  }
}
