import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import type { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-post-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-list-item.component.html',
  styleUrl: './post-list-item.component.scss',
})
export class PostListItemComponent {
  readonly post = input.required<Post>();
  readonly index = input.required<number>();
  readonly author = input<User | undefined>(undefined);
  readonly focused = input(false);

  readonly pick = output<Post>();
  readonly moveFocus = output<-1 | 1>();
  readonly activate = output<Post>();

  protected preview(): string {
    return this.post().body;
  }

  protected authorName(): string {
    return this.author()?.name ?? 'Unknown author';
  }

  protected formattedDate(): string {
    return new Date(this.post().createdAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected isoDate(): string {
    return new Date(this.post().createdAt).toISOString();
  }

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.moveFocus.emit(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.moveFocus.emit(-1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.activate.emit(this.post());
    }
  }
}
