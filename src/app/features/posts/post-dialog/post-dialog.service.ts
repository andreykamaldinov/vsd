import { Injectable, inject, signal } from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import type { User } from '../../../core/models/user.model';
import { DialogService } from '../../../shared/dialog/dialog.service';

@Injectable({ providedIn: 'root' })
export class PostDialogService {
  private readonly dialog = inject(DialogService);
  private readonly postState = signal<Post | null>(null);
  private readonly authorState = signal<User | undefined>(undefined);

  readonly isOpen = this.dialog.isOpen;
  readonly post = this.postState.asReadonly();
  readonly author = this.authorState.asReadonly();

  open(post: Post, author: User | undefined): void {
    this.postState.set(post);
    this.authorState.set(author);
    this.dialog.open();
  }

  close(): void {
    this.dialog.close();
  }
}
