import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import type { User } from '../../../core/models/user.model';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-post-list-item',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './post-list-item.component.html',
    styleUrl: './post-list-item.component.scss',
    imports: [DatePipe],
})
export class PostListItemComponent {
    public readonly post = input.required<Post>();
    public readonly index = input.required<number>();
    public readonly author = input<User | undefined>(undefined);
    public readonly focused = input(false);

    public readonly pick = output<Post>();
    public readonly moveFocus = output<-1 | 1>();
    public readonly activate = output<Post>();

    public onKey(ev: KeyboardEvent): void {
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
