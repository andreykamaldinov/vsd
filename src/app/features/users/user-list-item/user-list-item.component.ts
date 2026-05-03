import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { User } from '../../../core/models/user.model';

@Component({
    selector: 'app-user-list-item',
    standalone: true,
    templateUrl: './user-list-item.component.html',
    styleUrl: './user-list-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListItemComponent {
    public readonly user = input.required<User>();
    public readonly index = input.required<number>();
    public readonly selected = input<boolean>(false);
    public readonly toggled = output<number>();

    public onToggle(): void {
        this.toggled.emit(this.user().id);
    }
}
