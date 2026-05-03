import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { User } from '../../core/models/user.model';
import { AppStore } from '../../core/store/app.store';
import { VirtualScrollerComponent } from '../../shared/virtual-scroller/virtual-scroller.component';
import { UserListItemComponent } from './user-list-item.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [VirtualScrollerComponent, UserListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="users-col" aria-label="Users">
      <header class="sticky-head">
        <h2>Users</h2>
        <p class="sub">
          {{ selectedCount() }} selected · {{ totalUsers() }} total
        </p>
      </header>
      <div
        class="listbox"
        role="listbox"
        aria-label="Users"
        aria-multiselectable="true"
      >
        <app-virtual-scroller
          class="list-viewport"
          [items]="users()"
          [trackBy]="trackUser"
          [estimateItemHeight]="96"
          [overscan]="10"
        >
          <ng-template let-user let-index="index">
            <app-user-list-item
              [user]="user"
              [selected]="isSelected(user.id)"
              (toggle)="store.toggleUser(user.id)"
            />
          </ng-template>
        </app-virtual-scroller>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      border-right: 1px solid var(--border, #e2e8f0);
      background: var(--surface-2, #f8fafc);
    }
    .users-col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .sticky-head {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 0.85rem 1rem;
      background: color-mix(in srgb, var(--surface-2, #f8fafc) 92%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border, #e2e8f0);
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
    .listbox {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 0.35rem 0.5rem 0.75rem;
    }
    .list-viewport {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class UsersListComponent {
  readonly store = inject(AppStore);

  protected readonly users = computed(() => this.store.allUsers());
  protected readonly totalUsers = computed(() => this.store.allUsers().length);
  protected readonly selectedCount = computed(() => this.store.usersSelected().size);

  protected readonly trackUser = (u: User, _i: number): number => u.id;

  protected isSelected(id: number): boolean {
    return this.store.usersSelected().has(id);
  }
}
