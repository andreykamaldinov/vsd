import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';

import { generateCommentsForPost } from '../../core/data/fake-data.generator';
import type { Comment } from '../../core/models/comment.model';
import type { Post } from '../../core/models/post.model';
import type { User } from '../../core/models/user.model';

const COMMENT_SEED = 0xdecafbad;

@Component({
  selector: 'app-post-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="backdrop"
        (click)="onBackdrop($event)"
        role="presentation"
      ></div>
      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        tabindex="-1"
        #panel
      >
        <header class="panel-head">
          <h2 [id]="titleId">{{ post()!.title }}</h2>
          <button type="button" class="icon-btn" (click)="close.emit()" aria-label="Close dialog">
            ✕
          </button>
        </header>
        <div class="meta">
          <span>{{ authorName() }}</span>
          <span>·</span>
          <time [attr.datetime]="isoDate()">{{ formattedDate() }}</time>
          <span>·</span>
          <span>{{ post()!.readTime }} min read</span>
        </div>
        <p class="body">{{ post()!.body }}</p>
        @if (post()!.tags.length) {
          <ul class="tags" aria-label="Tags">
            @for (tag of post()!.tags; track tag) {
              <li>{{ tag }}</li>
            }
          </ul>
        }
        <section class="comments" aria-label="Comments">
          <h3>Comments ({{ comments().length }})</h3>
          <ul>
            @for (c of comments(); track c.id) {
              <li>
                <div class="c-head">
                  <strong>{{ c.author }}</strong>
                  <time [attr.datetime]="commentIso(c)">{{ commentFormatted(c) }}</time>
                </div>
                <p>{{ c.body }}</p>
              </li>
            }
          </ul>
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      pointer-events: none;
    }
    .backdrop {
      pointer-events: auto;
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
    }
    .panel {
      pointer-events: auto;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(640px, calc(100vw - 2rem));
      max-height: min(85vh, 900px);
      overflow: auto;
      background: var(--surface, #fff);
      color: var(--text, #0f172a);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      padding: 1.25rem 1.5rem 1.5rem;
      outline: none;
    }
    .panel:focus-visible {
      box-shadow:
        0 0 0 3px var(--ring, #2563eb),
        0 25px 50px -12px rgba(0, 0, 0, 0.35);
    }
    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      line-height: 1.3;
      font-weight: 600;
    }
    .icon-btn {
      flex: none;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0.25rem;
      border-radius: 6px;
    }
    .icon-btn:focus-visible {
      outline: 2px solid var(--ring, #2563eb);
      outline-offset: 2px;
    }
    .meta {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--muted, #64748b);
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .body {
      margin: 1rem 0 0;
      line-height: 1.55;
      white-space: pre-wrap;
    }
    .tags {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .tags li {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--muted, #64748b) 18%, transparent);
    }
    .comments {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid color-mix(in srgb, var(--muted, #64748b) 35%, transparent);
    }
    .comments h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
    }
    .comments ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .c-head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--muted, #64748b);
      margin-bottom: 0.25rem;
    }
    .comments p {
      margin: 0;
      line-height: 1.45;
      font-size: 0.9rem;
    }
  `,
})
export class PostDialogComponent {
  private readonly injectorRef = inject(Injector);

  readonly open = input(false);
  readonly post = input<Post | null>(null);
  readonly author = input<User | undefined>(undefined);

  readonly close = output<void>();

  protected readonly titleId = `post-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly comments = computed<Comment[]>(() => {
    const p = this.post();
    if (!p || !this.open()) {
      return [];
    }
    const n = 2 + (p.id % 14);
    return generateCommentsForPost(p.id, n, COMMENT_SEED ^ p.id);
  });

  protected readonly authorName = computed(() => {
    const u = this.author();
    return u?.name ?? 'Unknown author';
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      afterNextRender(
        () => {
          this.panel()?.nativeElement.focus();
        },
        { injector: this.injectorRef },
      );
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close.emit();
    }
  }

  protected formattedDate(): string {
    const p = this.post();
    if (!p) {
      return '';
    }
    return new Date(p.createdAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected isoDate(): string {
    const p = this.post();
    return p ? new Date(p.createdAt).toISOString() : '';
  }

  protected commentIso(c: Comment): string {
    return new Date(c.createdAt).toISOString();
  }

  protected commentFormatted(c: Comment): string {
    return new Date(c.createdAt).toLocaleDateString();
  }

  onBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.close.emit();
    }
  }
}
