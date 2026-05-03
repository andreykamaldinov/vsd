import { Directive, inject } from '@angular/core';

import { DialogService } from './dialog.service';

@Directive({
  selector: '[appDialogClose]',
  host: {
    '(click)': 'onClick()',
  },
})
export class DialogCloseDirective {
  private readonly dialog = inject(DialogService);

  public onClick(): void {
    this.dialog.close();
  }
}
