import { Directive, HostListener, input, output } from '@angular/core';

import type { Post } from '../../../core/models/post.model';
import { UiVirtualScrollComponent } from '../../../shared/ui-virtual-scroll/ui-virtual-scroll.component';

@Directive({
  selector: '[appPostList]',
})
export class PostListDirective {
  public readonly virtualScroll = input<UiVirtualScrollComponent<Post> | undefined>(undefined);
  public readonly posts = input.required<readonly Post[]>();
  public readonly activatePost = output<Post>();

  @HostListener('window:keydown', ['$event'])
  public onWindowKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const preventDefault = (): void => {
      keyboardEvent.preventDefault();
    };
    const vs = this.virtualScroll();

    switch (keyboardEvent.key) {
      case 'ArrowUp':
        if (vs) {
          preventDefault();
          vs.scrollByItems(-1);
        }
        break;
      case 'ArrowDown':
        if (vs) {
          preventDefault();
          vs.scrollByItems(1);
        }
        break;
      case 'Enter': {
        if (this.isEditableFieldTarget(keyboardEvent.target)) {
          return;
        }
        const posts = this.posts();
        if (posts.length === 0) {
          return;
        }
        preventDefault();
        const i = vs?.getFirstVisibleItemIndex() ?? 0;
        this.activatePost.emit(posts[i]);
        break;
      }
      default:
        break;
    }
  }

  private isEditableFieldTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      target.closest('input, textarea, select, [contenteditable="true"]') !== null
    );
  }
}
