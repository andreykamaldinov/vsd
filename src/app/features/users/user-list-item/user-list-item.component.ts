import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list-item.component.html',
  styleUrl: './user-list-item.component.scss',
})
export class UserListItemComponent {
  readonly user = input.required<User>();
  readonly index = input.required<number>();
  readonly selected = input(false);
  readonly focused = input(false);

  readonly toggle = output<void>();
  readonly moveFocus = output<-1 | 1>();

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.moveFocus.emit(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.moveFocus.emit(-1);
    }
  }
}
