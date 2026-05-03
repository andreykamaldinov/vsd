import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppStore } from '../../../core/store/app.store';
import { PostSortMode } from '../../../core/models/sort-mode';

@Component({
    selector: 'app-posts-header',
    standalone: true,
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './posts-header.component.html',
    styleUrl: './posts-header.component.scss',
})
export class PostsHeaderComponent {
    private readonly store = inject(AppStore);

    public readonly sort = this.store.sort();
    public readonly shownPostsCount = input(0);
    public readonly filteredPostsTotal = input(0);
    public readonly draft = signal('');

    public constructor() {
        effect(() => {
            this.draft.set(this.store.postSearch());
        });
    }

    public onSearchInput(value: string): void {
        this.draft.set(value);
        this.store.setPostSearch(value);
    }

    public onSort(mode: PostSortMode): void {
        this.store.setSort(mode);
    }
}
