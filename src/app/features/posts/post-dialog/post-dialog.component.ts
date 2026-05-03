import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { generateCommentsForPost } from '../../../shared/data/fake-data.generator';
import type { Comment } from '../../../shared/models/comment.model';
import { DialogCloseDirective } from '../../../shared/dialog/dialog-close.directive';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { PostDialogService } from './post-dialog.service';

@Component({
    selector: 'app-post-dialog',
    imports: [DialogComponent, DialogCloseDirective, DatePipe],
    templateUrl: './post-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDialogComponent {
    private readonly postDialog = inject(PostDialogService);

    public readonly isOpen = this.postDialog.isOpen;
    public readonly post = this.postDialog.post;
    public readonly author = this.postDialog.author;
    public readonly titleId = signal(`post-dialog-title-${Math.random().toString(36).slice(2, 9)}`);

    public readonly comments = computed<Comment[]>(() => {
        const post = this.post();

        if (!post || !this.isOpen()) {
            return [];
        }
        return generateCommentsForPost(post.id);
    });
}
