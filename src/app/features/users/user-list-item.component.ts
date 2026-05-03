import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="user-btn"
      [class.selected]="selected()"
      (click)="toggle.emit()"
      [attr.aria-selected]="selected()"
      role="option"
    >
      <span class="avatar" [style.background]="user().avatarColor">{{ user().initials }}</span>
      <span class="stack">
        <span class="name">{{ user().name }}</span>
        <span class="line">{{ user().role }} · {{ user().company }}</span>
        <span class="email">{{ user().email }}</span>
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .user-btn {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      width: 100%;
      text-align: left;
      padding: 0.65rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 10px;
      background: var(--row-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }
    .user-btn:focus-visible {
      outline: 2px solid var(--ring, #2563eb);
      outline-offset: 2px;
    }
    .user-btn.selected {
      border-color: color-mix(in srgb, var(--ring, #2563eb) 55%, transparent);
      background: color-mix(in srgb, var(--ring, #2563eb) 12%, transparent);
    }
    .avatar {
      flex: none;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fff;
    }
    .stack {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .name {
      font-weight: 600;
      line-height: 1.25;
    }
    .line,
    .email {
      font-size: 0.78rem;
      color: var(--muted, #64748b);
      line-height: 1.3;
      word-break: break-word;
    }
  `,
})
export class UserListItemComponent {
  readonly user = input.required<User>();
  readonly selected = input(false);

  readonly toggle = output<void>();
}
