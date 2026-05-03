import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  private readonly injectorRef = inject(Injector);
  private readonly dialog = inject(DialogService);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly labelledBy = input<string | null>(null);
  protected readonly isOpen = this.dialog.isOpen;

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        return;
      }
      afterNextRender(
        () => {
          this.panel()?.nativeElement.focus();
        },
        { injector: this.injectorRef },
      );
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.dialog.close();
    }
  }

  protected onBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.dialog.close();
    }
  }
}
