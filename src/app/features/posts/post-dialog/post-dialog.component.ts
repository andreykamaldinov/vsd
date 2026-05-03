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

import {
  commentCountForPost,
  generateCommentsForPost,
} from '../../../core/data/fake-data.generator';
import type { Comment } from '../../../core/models/comment.model';
import type { Post } from '../../../core/models/post.model';
import type { User } from '../../../core/models/user.model';

const COMMENT_SEED = 0xdecafbad;

@Component({
  selector: 'app-post-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-dialog.component.html',
  styleUrl: './post-dialog.component.scss',
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
    const n = commentCountForPost(p.id);
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
