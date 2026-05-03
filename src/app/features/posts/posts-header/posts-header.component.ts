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
    imports: [FormsModule],
    templateUrl: './posts-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsHeaderComponent {
    private readonly store = inject(AppStore);

    public readonly visibleSummary = input('');
    public readonly draft = signal('');
    public readonly sortMode = computed(() => this.store.sort());

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
