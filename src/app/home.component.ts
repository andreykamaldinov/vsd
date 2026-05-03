import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PostsListComponent } from './features/posts/posts-list/posts-list.component';
import { UsersListComponent } from './features/users-list/users-list.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [UsersListComponent, PostsListComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class Home {}
