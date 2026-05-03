import { Directive, HostListener, inject } from '@angular/core';

import { DialogService } from './dialog.service';

@Directive({
  selector: '[appDialogClose]',
  standalone: true,
})
export class DialogCloseDirective {
  private readonly dialog = inject(DialogService);

  @HostListener('click')
  onClick(): void {
    this.dialog.close();
  }
}
