import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Post } from '../../core/models/post.model';
import type { User } from '../../core/models/user.model';

@Component({
  selector: 'app-post-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="post-btn"
      [attr.data-post-index]="index()"
      [tabindex]="focused() ? 0 : -1"
      (click)="pick.emit(post())"
      (keydown)="onKey($event)"
    >
      <span class="title">{{ post().title }}</span>
      <span class="preview">{{ preview() }}</span>
      <span class="meta">
        <span>{{ authorName() }}</span>
        <span>·</span>
        <time [attr.datetime]="isoDate()">{{ formattedDate() }}</time>
        <span>·</span>
        <span>{{ post().readTime }} min read</span>
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .post-btn {
      width: 100%;
      text-align: left;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
      background: var(--surface, #fff);
      color: inherit;
      cursor: pointer;
      font: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .post-btn:focus-visible {
      outline: 2px solid var(--ring, #2563eb);
      outline-offset: 2px;
    }
    .title {
      font-weight: 600;
      line-height: 1.3;
    }
    .preview {
      font-size: 0.88rem;
      line-height: 1.45;
      color: var(--muted, #64748b);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta {
      font-size: 0.78rem;
      color: var(--muted, #64748b);
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
  `,
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
