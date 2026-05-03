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
      let raf = 0;
      this.ro = new ResizeObserver(() => {
        if (raf) {
          return;
        }
        raf = requestAnimationFrame(() => {
          raf = 0;
          const el = this.el.nativeElement;
          const h = el.offsetHeight;
          this.host.reportMeasuredHeight(this.appVsMeasureRow(), h);
        });
      });
      this.ro.observe(this.el.nativeElement);
      this.destroyRef.onDestroy(() => {
        this.ro?.disconnect();
        if (raf) {
          cancelAnimationFrame(raf);
        }
      });
    });
  }
}
