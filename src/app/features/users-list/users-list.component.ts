import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AppStore } from '../../core/store/app.store';
import { UiVirtualScrollComponent } from '../../shared/ui-virtual-scroll/ui-virtual-scroll.component';
import { UserListItemComponent } from './user-list-item/user-list-item.component';

const USER_ROW_HEIGHT_PX = 100;

@Component({
    selector: 'app-users-list',
    imports: [UserListItemComponent, UiVirtualScrollComponent],
    templateUrl: './users-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
    public readonly store = inject(AppStore);
    public readonly allUsers = computed(() => this.store.allUsers());
    public readonly usersSelected = computed(() => this.store.usersSelected());
    public readonly userRowHeightPx = signal(USER_ROW_HEIGHT_PX);
}
