import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DialogService {
    private readonly _openState = signal(false);

    public readonly isOpen = this._openState.asReadonly();

    public open(): void {
        this._openState.set(true);
    }

    public close(): void {
        this._openState.set(false);
    }
}
