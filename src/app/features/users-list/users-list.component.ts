import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '../../core/store/app.store';
import { UserListItemComponent } from './user-list-item/user-list-item.component';

@Component({
    selector: 'app-users-list',
    imports: [UserListItemComponent],
    standalone: true,
    templateUrl: './users-list.component.html',
    styleUrl: './users-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
    public readonly store = inject(AppStore);
    public allUsers = signal(this.store.allUsers());
    public usersSelected = computed(() => this.store.usersSelected());
}
