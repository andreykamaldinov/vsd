import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  untracked,
  input,
  output,
  signal,
  contentChild,
  TemplateRef,
  viewChild,
} from '@angular/core';

import type { VirtualScrollHost } from './virtual-scroll-host.token';
import { VIRTUAL_SCROLL_HOST } from './virtual-scroll-host.token';
import type { VirtualScrollTemplateContext } from './virtual-scroller.types';
import { VsMeasureRowDirective } from './vs-measure-row.directive';

/** How {@link VirtualScrollerComponent.scrollToIndex} places the row in the viewport. */
export type VirtualScrollAlign = 'start' | 'center' | 'end' | 'nearest';

/**
 * Variable-height virtual list: prefix sums + binary search for visible range,
 * transform translateY for the window, height cache keyed by trackBy(item).
 *
 * **Recycling:** only visible rows (+ overscan) exist in the DOM. `@for` with a
 * stable `trackBy` reuses views when the same item scrolls back into range,
 * keeping node count low (no full-list rendering).
 *
 * Scroll updates use requestAnimationFrame. ResizeObserver callbacks are batched
 * in rAF (see `VsMeasureRowDirective`) before prefix sums are rebuilt.
 */
@Component({
  selector: 'app-virtual-scroller',
  standalone: true,
  imports: [NgTemplateOutlet, VsMeasureRowDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: VIRTUAL_SCROLL_HOST, useExisting: VirtualScrollerComponent }],
  templateUrl: './virtual-scroller.component.html',
  styleUrl: './virtual-scroller.component.scss',
})
export class VirtualScrollerComponent<T = unknown> implements VirtualScrollHost {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly items = input.required<readonly T[]>();
  readonly trackBy = input.required<(item: T, index: number) => unknown>();
  /** Fallback height per row until ResizeObserver reports a measurement. */
  readonly estimatedItemHeight = input(72);
  readonly overscan = input(8);

  /**
   * Logical focused row (e.g. keyboard). When it changes, the viewport scrolls that
   * row into view using `focusedScrollBehavior`. Omit by leaving null/undefined.
   */
  readonly focusedIndex = input<number | null>(null);
  readonly focusedScrollBehavior = input<ScrollBehavior>('smooth');

  readonly itemTemplate = contentChild.required<TemplateRef<VirtualScrollTemplateContext<T>>>(TemplateRef);

  /**
   * `start`/`end` = first/last item indices intersecting the viewport (inclusive).
   * `count` = number of viewport-visible rows (`end - start + 1`, or 0 when empty).
   * DOM still renders `start - overscan` … `end + overscan` internally.
   */
  readonly visibleRangeChange = output<{ start: number; end: number; count: number }>();

  /**
   * Current DOM window: **absolute** item indices into `items` — `[start, end)` with `end` exclusive.
   * Example: rendering rows 2841–2856 emits `{ start: 2841, end: 2857, count: 16 }`.
   */
  readonly renderedRangeChange = output<{ start: number; end: number; count: number }>();

  protected readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private readonly heightCache = new Map<unknown, number>();
  private prefix = new Float64Array(0);

  private readonly windowStart = signal(0);

  private scrollRaf = 0;
  private measureRaf = 0;
  private focusScrollRaf = 0;
  private scrollListener?: () => void;
  private clearPinListener?: () => void;

  /**
   * After `scrollToIndex(..., 'start')`, re-apply this scroll offset whenever prefix
   * heights change (measurement), so the same row stays pinned to the top.
   * Cleared on `items` updates, non-start scroll, or user wheel/touch.
   */
  private pinScrollStartIndex: number | null = null;

  /** When list identity changes (filter/sort/length), drop pin — not on every array reference churn. */
  private itemsListFingerprint = '';

  /**
   * Extra pixels after the last row in the scroll rail. When many rows still use
   * {@link estimatedItemHeight}, {@link prefix}[n] can be far below the true sum of
   * heights — native max scroll is then too low and DOM alignment cannot finish.
   */
  private tailSlackPx = 0;

  constructor() {
    afterNextRender(() => {
      const el = this.viewport().nativeElement;
      this.scrollListener = () => this.scheduleScrollUpdate();
      el.addEventListener('scroll', this.scrollListener, { passive: true });
      const clearPin = () => {
        this.pinScrollStartIndex = null;
      };
      el.addEventListener('wheel', clearPin, { passive: true });
      el.addEventListener('touchstart', clearPin, { passive: true });
      this.clearPinListener = () => {
        el.removeEventListener('wheel', clearPin);
        el.removeEventListener('touchstart', clearPin);
      };
      let viewportRo: ResizeObserver | undefined;
      let roRaf = 0;
      viewportRo = new ResizeObserver(() => {
        if (roRaf) {
          return;
        }
        roRaf = requestAnimationFrame(() => {
          roRaf = 0;
          if (this.pinScrollStartIndex !== null) {
            this.rebuildPrefix();
          } else {
            this.updateVisibleRangeFromScroll();
          }
        });
      });
      viewportRo.observe(el);
      this.destroyRef.onDestroy(() => {
        viewportRo?.disconnect();
        if (roRaf) {
          cancelAnimationFrame(roRaf);
        }
        if (this.scrollListener) {
          el.removeEventListener('scroll', this.scrollListener);
        }
        this.clearPinListener?.();
      });
      this.rebuildPrefix();
    });

    effect(() => {
      const items = this.items();
      const n = items.length;
      const tb = this.trackBy();
      const est = this.estimatedItemHeight();
      const firstKey = n > 0 ? String(tb(items[0]!, 0)) : '';
      const lastKey = n > 0 ? String(tb(items[n - 1]!, n - 1)) : '';
      const fp = `${n}:${firstKey}:${lastKey}:${est}`;
      if (fp !== this.itemsListFingerprint) {
        this.pinScrollStartIndex = null;
        this.tailSlackPx = 0;
        this.itemsListFingerprint = fp;
      }
      this.pruneHeightCache(items);
      this.rebuildPrefix();
    });

    effect(() => {
      const idx = this.focusedIndex();
      const behavior = this.focusedScrollBehavior();
      if (idx == null || idx < 0) {
        return;
      }
      const len = untracked(() => this.items().length);
      if (idx >= len) {
        return;
      }
      this.scheduleScrollToFocusedIndex(idx, behavior);
    });

    this.destroyRef.onDestroy(() => {
      if (this.focusScrollRaf) {
        cancelAnimationFrame(this.focusScrollRaf);
      }
    });
  }

  protected readonly totalHeight = signal(0);

  protected readonly windowTransform = signal('translate3d(0,0,0)');

  protected readonly visibleRows = signal<
    Array<{ item: T; index: number; trackKey: unknown }>
  >([]);

  protected rowTemplateContext(item: T, index: number): VirtualScrollTemplateContext<T> {
    return { $implicit: item, index };
  }

  reportMeasuredHeight(key: unknown, height: number): void {
    if (!Number.isFinite(height) || height <= 0) {
      return;
    }
    const prev = this.heightCache.get(key);
    if (prev !== undefined && Math.abs(prev - height) < 0.5) {
      return;
    }
    this.heightCache.set(key, height);
    this.scheduleMeasureCommit();
  }

  /**
   * Scroll so row `index` is placed per `align`. Use `'start'` for URL / lead restore (first visible row).
   * `behavior` applies to programmatic `scrollTo` for non-`'start'` alignments (`'start'` uses instant `scrollTop`).
   */
  scrollToIndex(
    index: number,
    align: VirtualScrollAlign = 'start',
    behavior: ScrollBehavior = 'auto',
  ): void {
    const el = this.viewport()?.nativeElement;
    const items = this.items();
    if (!el || index < 0 || index >= items.length) {
      return;
    }

    if (align === 'start') {
      this.pinScrollStartIndex = index;
      this.rebuildPrefix();
      return;
    }

    this.pinScrollStartIndex = null;
    this.rebuildPrefix();

    const itemOffset = this.prefix[index] ?? 0;
    const itemHeight = this.rowHeightAt(index);
    const vh = el.clientHeight;
    const max = Math.max(0, this.totalHeight() - vh);
    let nextScrollTop: number;

    switch (align) {
      case 'center':
        nextScrollTop = itemOffset - vh / 2 + itemHeight / 2;
        break;
      case 'end':
        nextScrollTop = itemOffset - vh + itemHeight;
        break;
      case 'nearest': {
        const viewTop = el.scrollTop;
        const viewBottom = viewTop + vh;
        const top = itemOffset;
        const bottom = itemOffset + itemHeight;
        if (top < viewTop) {
          nextScrollTop = top;
        } else if (bottom > viewBottom) {
          nextScrollTop = bottom - vh;
        } else {
          return;
        }
        break;
      }
      default:
        nextScrollTop = itemOffset;
    }

    el.scrollTo({
      top: Math.max(0, Math.min(max, nextScrollTop)),
      behavior,
    });
    this.updateVisibleRangeFromScroll();
  }

  clampScrollTop(): void {
    const el = this.viewport()?.nativeElement;
    if (!el) {
      return;
    }
    const max = Math.max(0, this.totalHeight() - el.clientHeight);
    if (el.scrollTop > max) {
      el.scrollTop = max;
    }
    this.updateVisibleRangeFromScroll();
  }

  /** For list keyboard focus: query rendered row controls inside the viewport. */
  getViewportElement(): HTMLElement | undefined {
    return this.viewport()?.nativeElement;
  }

  /** Clears start-align pin so `rebuildPrefix` no longer overwrites `scrollTop`. */
  releaseScrollStartPin(): void {
    this.pinScrollStartIndex = null;
  }

  /**
   * Nudge `scrollTop` so `selector`'s first match aligns its top edge with the viewport top.
   * Clears the start-align pin so a later `rebuildPrefix` does not undo this correction
   * (prefix sums can lag real layout when many rows still use estimated heights).
   *
   * @returns whether a matching element was found
   */
  correctViewportToSelectorTop(selector: string): boolean {
    const el = this.viewport()?.nativeElement;
    if (!el) {
      this.pinScrollStartIndex = null;
      return false;
    }
    // Pin + rebuildPrefix would restore underestimated prefix[position]; slack growth needs a free scrollTop.
    this.pinScrollStartIndex = null;
    let found = false;
    // Prefix uses estimated heights for off-screen rows; grow tail slack if we hit max scroll.
    for (let pass = 0; pass < 24; pass++) {
      const target = el.querySelector(selector);
      if (!(target instanceof Element)) {
        break;
      }
      found = true;
      const viewRect = el.getBoundingClientRect();
      const rowRect = target.getBoundingClientRect();
      const delta = rowRect.top - viewRect.top;
      if (Math.abs(delta) < 0.5) {
        break;
      }
      const prevTop = el.scrollTop;
      el.scrollTop += delta;
      const moved = el.scrollTop - prevTop;
      if (delta > 1 && moved + 0.5 < delta) {
        const shortfall = delta - moved;
        this.tailSlackPx += Math.ceil(shortfall) + 96;
        this.rebuildPrefix();
        this.cdr.detectChanges();
        // Rail height binding may not have flushed yet — `scrollHeight` can lag one frame.
        const cap = Math.max(0, this.totalHeight() - el.clientHeight);
        el.scrollTop = Math.min(prevTop + delta, cap);
      }
      // Without a sync refresh, `visibleRows` + transform lag one rAF while scrollTop already
      // moved — getBoundingClientRect then reflects a stale window (~overscan rows off).
      this.updateVisibleRangeFromScroll();
      this.cdr.detectChanges();
    }
    this.pinScrollStartIndex = null;
    this.updateVisibleRangeFromScroll();
    this.cdr.detectChanges();
    return found;
  }

  private scheduleScrollUpdate(): void {
    if (this.scrollRaf) {
      return;
    }
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.updateVisibleRangeFromScroll();
    });
  }

  private scheduleMeasureCommit(): void {
    if (this.measureRaf) {
      return;
    }
    this.measureRaf = requestAnimationFrame(() => {
      this.measureRaf = 0;
      this.rebuildPrefix();
    });
  }

  private scheduleScrollToFocusedIndex(index: number, behavior: ScrollBehavior): void {
    if (this.focusScrollRaf) {
      cancelAnimationFrame(this.focusScrollRaf);
    }
    this.focusScrollRaf = requestAnimationFrame(() => {
      this.focusScrollRaf = 0;
      this.scrollToIndex(index, 'nearest', behavior);
    });
  }

  private pruneHeightCache(items: readonly T[]): void {
    const tb = this.trackBy();
    const keep = new Set<unknown>();
    for (let i = 0; i < items.length; i++) {
      keep.add(tb(items[i]!, i));
    }
    for (const k of this.heightCache.keys()) {
      if (!keep.has(k)) {
        this.heightCache.delete(k);
      }
    }
  }

  private rebuildPrefix(): void {
    const items = this.items();
    const n = items.length;
    const prefix = new Float64Array(n + 1);
    const tb = this.trackBy();
    const est = this.estimatedItemHeight();
    for (let i = 0; i < n; i++) {
      const key = tb(items[i]!, i);
      const h = this.heightCache.get(key) ?? est;
      prefix[i + 1] = prefix[i]! + h;
    }
    this.prefix = prefix;
    const contentBottom = n === 0 ? 0 : prefix[n]!;
    let total = contentBottom + this.tailSlackPx;
    this.totalHeight.set(total);
    const el = this.viewport()?.nativeElement;
    if (el) {
      let max = Math.max(0, total - el.clientHeight);
      const pin = this.pinScrollStartIndex;
      if (pin !== null && pin >= 0 && pin < n) {
        const t = prefix[pin]!;
        if (t > max) {
          this.tailSlackPx += Math.ceil(t - max) + 96;
          total = contentBottom + this.tailSlackPx;
          this.totalHeight.set(total);
          max = Math.max(0, total - el.clientHeight);
        }
        el.scrollTop = Math.min(Math.max(0, t), max);
      } else if (el.scrollTop > max) {
        el.scrollTop = max;
      }
    }
    this.updateVisibleRangeFromScroll();
  }

  private rowHeightAt(index: number): number {
    const items = this.items();
    const item = items[index];
    if (!item) {
      return this.estimatedItemHeight();
    }
    const key = this.trackBy()(item, index);
    return this.heightCache.get(key) ?? this.estimatedItemHeight();
  }

  private findFirstVisible(scrollTop: number, n: number): number {
    const prefix = this.prefix;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid + 1]! <= scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  private findLastVisible(scrollBottom: number, n: number): number {
    const prefix = this.prefix;
    if (n === 0) {
      return -1;
    }
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (prefix[mid]! < scrollBottom) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  private updateVisibleRangeFromScroll(): void {
    const el = this.viewport()?.nativeElement;
    const items = this.items();
    const n = items.length;
    if (!el || n === 0) {
      this.windowStart.set(0);
      this.visibleRows.set([]);
      this.updateWindowTransform();
      this.visibleRangeChange.emit({ start: 0, end: -1, count: 0 });
      this.renderedRangeChange.emit({ start: 0, end: 0, count: 0 });
      return;
    }

    const scrollTop = el.scrollTop;
    const vh = el.clientHeight;
    const bottom = scrollTop + vh;

    let first = this.findFirstVisible(scrollTop, n);
    let last = this.findLastVisible(bottom, n);

    // Before layout, `clientHeight` can be 0: avoid treating the whole list as visible.
    if (vh <= 0) {
      first = 0;
      last = 0;
    }

    const os = this.overscan();
    const renderStart = Math.max(0, first - os);
    const renderEnd = Math.min(n - 1, last + os);

    if (this.windowStart() !== renderStart) {
      this.windowStart.set(renderStart);
    }

    const tb = this.trackBy();
    const rows: Array<{ item: T; index: number; trackKey: unknown }> = [];
    for (let i = renderStart; i <= renderEnd; i++) {
      const item = items[i]!;
      rows.push({ item, index: i, trackKey: tb(item, i) });
    }
    this.visibleRows.set(rows);
    this.updateWindowTransform();

    const visibleCount = last < first ? 0 : last - first + 1;
    this.visibleRangeChange.emit({ start: first, end: last, count: visibleCount });

    const renderedEndExclusive = renderEnd + 1;
    const renderedCount = Math.max(0, renderedEndExclusive - renderStart);
    this.renderedRangeChange.emit({
      start: renderStart,
      end: renderedEndExclusive,
      count: renderedCount,
    });
  }

  private updateWindowTransform(): void {
    const start = this.windowStart();
    const offset = this.prefix[start] ?? 0;
    this.windowTransform.set(`translate3d(0,${offset}px,0)`);
  }
}
