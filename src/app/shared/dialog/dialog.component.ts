import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    viewChild,
} from '@angular/core';
import { DialogService } from './dialog.service';

@Component({
    selector: 'app-dialog',
    templateUrl: './dialog.component.html',
    styleUrl: './dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:keydown.escape)': 'onEscape()',
    },
})
export class DialogComponent {
    private readonly _injectorRef = inject(Injector);
    private readonly _dialog = inject(DialogService);
    private readonly _panel = viewChild<ElementRef<HTMLElement>>('panel');

    public readonly labelledBy = input<string | null>(null);
    public readonly isOpen = this._dialog.isOpen;

    public constructor() {
        effect(() => {
            if (!this.isOpen()) {
                return;
            }
            afterNextRender(
                () => {
                    this._panel()?.nativeElement.focus();
                },
                { injector: this._injectorRef }
            );
        });
    }

    public onEscape(): void {
        if (this.isOpen()) {
            this._dialog.close();
        }
    }

    public onBackdrop(ev: MouseEvent): void {
        if (ev.target === ev.currentTarget) {
            this._dialog.close();
        }
    }
}
