import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import type { User } from '../../../core/models/user.model';

@Component({
    selector: 'app-post-list-item',
    imports: [DatePipe],
    templateUrl: './post-list-item.component.html',
    styleUrl: './post-list-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { role: 'listitem' },
})
export class PostListItemComponent {
    public readonly post = input.required<Post>();
    public readonly author = input<User | undefined>(undefined);

    public readonly pick = output<Post>();
}
