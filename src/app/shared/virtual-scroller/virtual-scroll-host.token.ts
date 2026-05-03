import { InjectionToken } from '@angular/core';

export interface VirtualScrollHost {
  reportMeasuredHeight(key: unknown, height: number): void;
}

export const VIRTUAL_SCROLL_HOST = new InjectionToken<VirtualScrollHost>('VIRTUAL_SCROLL_HOST');
