import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';

import type { Post } from '../../../shared/models/post.model';
import { AppStore } from '../../../store/app.store';
import { UiVirtualScrollComponent } from '../../../shared/ui-virtual-scroll/ui-virtual-scroll.component';
import { PostDialogComponent } from '../post-dialog/post-dialog.component';
import { PostDialogService } from '../post-dialog/post-dialog.service';
import { PostListItemComponent } from '../post-list-item/post-list-item.component';
import { PostsHeaderComponent } from '../posts-header/posts-header.component';
import { PostListDirective } from './post-list.directive';

const POST_ROW_HEIGHT_PX = 172;

@Component({
    selector: 'app-posts-list',
    imports: [
        PostListDirective,
        PostsHeaderComponent,
        PostListItemComponent,
        PostDialogComponent,
        UiVirtualScrollComponent,
    ],
    templateUrl: './posts-list.component.html',
    styleUrl: './posts-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsListComponent {
    private readonly store = inject(AppStore);
    private readonly postDialog = inject(PostDialogService);
    protected readonly postsVirtualScroll = viewChild(UiVirtualScrollComponent);

    public readonly postsScrollHeaderSummary = signal('');
    public readonly posts = computed(() => this.store.filteredSortedPosts());
    public readonly userById = computed(() => this.store.userById());
    public readonly postRowHeightPx = signal(POST_ROW_HEIGHT_PX);

    public openPost(post: Post): void {
        this.postDialog.open(post, this.userById().get(post.userId) ?? null);
    }
}
