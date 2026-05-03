import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DialogComponent } from '../../../shared/dialog/dialog.component';
import { DialogCloseDirective } from '../../../shared/dialog/dialog-close.directive';
import { generateCommentsForPost } from '../../../core/data/fake-data.generator';
import type { Comment } from '../../../core/models/comment.model';
import { PostDialogService } from './post-dialog.service';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-post-dialog',
    standalone: true,
    imports: [DialogComponent, DialogCloseDirective, DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './post-dialog.component.html',
    styleUrl: './post-dialog.component.scss',
})
export class PostDialogComponent {
    private readonly postDialog = inject(PostDialogService);

    protected readonly isOpen = this.postDialog.isOpen;
    protected readonly post = this.postDialog.post;
    protected readonly author = this.postDialog.author;
    protected readonly titleId = `post-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

    protected readonly comments = computed<Comment[]>(() => {
        const post = this.post();

        if (!post || !this.isOpen()) {
            return [];
        }
        return generateCommentsForPost(post.id);
    });
}
