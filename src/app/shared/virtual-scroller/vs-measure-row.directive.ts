import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { VIRTUAL_SCROLL_HOST } from './virtual-scroll-host.token';

@Directive({
  selector: '[appVsMeasureRow]',
  standalone: true,
  host: {
    style: 'display: block;',
  },
})
export class VsMeasureRowDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly host = inject(VIRTUAL_SCROLL_HOST);
  private readonly destroyRef = inject(DestroyRef);

  readonly appVsMeasureRow = input.required<unknown>({ alias: 'appVsMeasureRow' });

  private ro?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.ro = new ResizeObserver(() => {
        const h = this.el.nativeElement.getBoundingClientRect().height;
        this.host.reportMeasuredHeight(this.appVsMeasureRow(), h);
      });
      this.ro.observe(this.el.nativeElement);
      this.destroyRef.onDestroy(() => this.ro?.disconnect());
    });
  }
}
