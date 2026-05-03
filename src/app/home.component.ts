import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PostsListComponent } from './features/posts/posts-list/posts-list.component';
import { UsersListComponent } from './features/users-list/users-list.component';

@Component({
  selector: 'app-home',
  imports: [UsersListComponent, PostsListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
