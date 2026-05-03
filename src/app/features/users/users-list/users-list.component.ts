import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';

import type { User } from '../../../core/models/user.model';
import { AppStore } from '../../../core/store/app.store';
import { VirtualScrollerComponent } from '../../../shared/virtual-scroller/virtual-scroller.component';
import { UserListItemComponent } from '../user-list-item/user-list-item.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [VirtualScrollerComponent, UserListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  readonly store = inject(AppStore);

  private readonly vs = viewChild<VirtualScrollerComponent<User>>('vs');

  protected readonly users = computed(() => this.store.allUsers());
  protected readonly totalUsers = computed(() => this.store.allUsers().length);
  protected readonly selectedCount = computed(() => this.store.usersSelected().size);

  /** Keyboard focus row; `-1` = no row focused yet (avoids “fake selection” on first card at load). */
  protected readonly focusedIndex = signal(-1);

  protected readonly usersSummary = computed(() => {
    const sel = this.selectedCount();
    const total = this.totalUsers();
    return `Users — ${sel.toLocaleString()} selected of ${total.toLocaleString()}`;
  });

  protected readonly trackUser = (u: User, _i: number): number => u.id;

  constructor() {
    effect(() => {
      const len = this.users().length;
      const cur = this.focusedIndex();
      if (len === 0) {
        this.focusedIndex.set(-1);
        return;
      }
      if (cur > len - 1) {
        this.focusedIndex.set(len - 1);
      }
    });

    effect(() => {
      const len = this.users().length;
      void len;
      queueMicrotask(() => this.vs()?.clampScrollTop());
    });

  }

  protected isSelected(id: number): boolean {
    return this.store.usersSelected().has(id);
  }

  protected onUserRowClick(index: number, userId: number): void {
    this.focusedIndex.set(index);
    this.store.toggleUser(userId);
    queueMicrotask(() => this.focusUserButton(index));
  }

  protected onUserMoveFocus(delta: -1 | 1): void {
    this.nudgeFocusedIndex(delta);
  }

  protected onUsersListKeydown(ev: KeyboardEvent): void {
    if ((ev.target as HTMLElement).closest('button.user-btn')) {
      return;
    }
    const len = this.users().length;
    if (len === 0) {
      return;
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.nudgeFocusedIndex(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.nudgeFocusedIndex(-1);
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      this.goFocusedIndex(0);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      this.goFocusedIndex(len - 1);
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      if (this.focusedIndex() < 0) {
        this.goFocusedIndex(0);
        return;
      }
      const u = this.users()[this.focusedIndex()];
      if (u) {
        this.store.toggleUser(u.id);
      }
    }
  }

  protected onUsersListMouseDown(ev: MouseEvent): void {
    if (this.users().length === 0) {
      return;
    }
    if ((ev.target as HTMLElement).closest('button.user-btn')) {
      return;
    }
    this.focusUserButton(this.focusedIndex());
  }

  protected onUsersVisibleRange(ev: { start: number; end: number; count: number }): void {
    if (ev.end < 0) {
      return;
    }
    const i = this.focusedIndex();
    if (i < 0) {
      return;
    }
    if (i >= ev.start && i <= ev.end) {
      return;
    }
    this.focusedIndex.set(ev.start);
    const ae = document.activeElement;
    if (
      ae instanceof HTMLElement &&
      ae.closest('.users-col .listbox')?.contains(ae) &&
      ae.matches('button.user-btn')
    ) {
      queueMicrotask(() => this.focusUserButton(ev.start));
    }
  }

  private nudgeFocusedIndex(delta: -1 | 1): void {
    const len = this.users().length;
    if (len === 0) {
      return;
    }
    const next = Math.min(len - 1, Math.max(0, this.focusedIndex() + delta));
    if (next === this.focusedIndex()) {
      return;
    }
    this.focusedIndex.set(next);
    queueMicrotask(() => this.focusUserButton(next));
  }

  private goFocusedIndex(index: number): void {
    const len = this.users().length;
    if (len === 0) {
      return;
    }
    const next = Math.min(len - 1, Math.max(0, index));
    this.focusedIndex.set(next);
    queueMicrotask(() => this.focusUserButton(next));
  }

  private focusUserButton(index: number): void {
    if (index < 0) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = this.vs()?.getViewportElement();
        const btn = root?.querySelector<HTMLButtonElement>(`[data-user-index="${index}"]`);
        btn?.focus({ preventScroll: true });
      });
    });
  }
}
