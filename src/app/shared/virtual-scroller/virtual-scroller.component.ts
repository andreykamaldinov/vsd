import { NgTemplateOutlet } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
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

/**
 * Variable-height virtual list: prefix sums + binary search for visible range,
 * transform translateY for the window, height cache keyed by trackBy(item).
 *
 * Scroll updates are scheduled with requestAnimationFrame. ResizeObserver
 * batches prefix recomputation in rAF to avoid layout thrash.
 */
@Component({
    selector: 'app-virtual-scroller',
    standalone: true,
    imports: [NgTemplateOutlet, VsMeasureRowDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: VIRTUAL_SCROLL_HOST, useExisting: VirtualScrollerComponent }],
    template: `
        <div #viewport class="vs-viewport" role="presentation">
            <div class="vs-scroll-rail" [style.height.px]="totalHeight()">
                <div class="vs-window" [style.transform]="windowTransform()">
                    @for (row of visibleRows(); track row.trackKey) {
                        <div class="vs-row" [appVsMeasureRow]="row.trackKey">
                            <ng-container
                                *ngTemplateOutlet="
                                    itemTemplate()!;
                                    context: rowTemplateContext(row.item, row.index)
                                " />
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
            min-height: 0;
            flex: 1;
        }
        .vs-viewport {
            position: relative;
            overflow: auto;
            height: 100%;
            min-height: 0;
            contain: strict;
        }
        .vs-scroll-rail {
            position: relative;
            width: 100%;
            pointer-events: none;
        }
        .vs-window {
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            will-change: transform;
            pointer-events: auto;
        }
        .vs-row {
            overflow: hidden;
        }
    `,
})
export class VirtualScrollerComponent<T = unknown> implements VirtualScrollHost {
    private readonly destroyRef = inject(DestroyRef);

    readonly items = input.required<readonly T[]>();
    readonly trackBy = input.required<(item: T, index: number) => unknown>();
    readonly estimateItemHeight = input(72);
    readonly overscan = input(8);

    readonly itemTemplate =
        contentChild.required<TemplateRef<VirtualScrollTemplateContext<T>>>(TemplateRef);

    readonly visibleRangeChange = output<{ start: number; end: number }>();

    protected readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

    private readonly heightCache = new Map<unknown, number>();
    private prefix = new Float64Array(0);

    private readonly windowStart = signal(0);

    private scrollRaf = 0;
    private measureRaf = 0;

    private scrollListener?: () => void;

    constructor() {
        afterNextRender(() => {
            const el = this.viewport().nativeElement;
            this.scrollListener = () => this.scheduleScrollUpdate();
            el.addEventListener('scroll', this.scrollListener, { passive: true });
            this.destroyRef.onDestroy(() => {
                if (this.scrollListener) {
                    el.removeEventListener('scroll', this.scrollListener);
                }
            });
            this.rebuildPrefix();
            this.updateVisibleRangeFromScroll();
        });

        effect(() => {
            const items = this.items();
            void items;
            this.pruneHeightCache(items);
            this.rebuildPrefix();
            this.scheduleScrollUpdate();
        });
    }

    protected readonly totalHeight = signal(0);

    protected readonly windowTransform = signal('translate3d(0,0,0)');

    protected readonly visibleRows = signal<Array<{ item: T; index: number; trackKey: unknown }>>(
        []
    );

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

    scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
        const el = this.viewport()?.nativeElement;
        const items = this.items();
        if (!el || index < 0 || index >= items.length) {
            return;
        }
        this.rebuildPrefix();
        const top = this.prefix[index] ?? 0;
        const h = this.rowHeightAt(index);
        const view = el.clientHeight;
        let target = top;
        if (top < el.scrollTop) {
            target = top;
        } else if (top + h > el.scrollTop + view) {
            target = top + h - view;
        }
        el.scrollTo({ top: Math.max(0, target), behavior });
        this.scheduleScrollUpdate();
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
        this.scheduleScrollUpdate();
    }

    /** For list keyboard focus: query rendered row controls inside the viewport. */
    getViewportElement(): HTMLElement | undefined {
        return this.viewport()?.nativeElement;
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
            this.updateVisibleRangeFromScroll();
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
        const est = this.estimateItemHeight();
        for (let i = 0; i < n; i++) {
            const key = tb(items[i]!, i);
            const h = this.heightCache.get(key) ?? est;
            prefix[i + 1] = prefix[i]! + h;
        }
        this.prefix = prefix;
        const total = n === 0 ? 0 : prefix[n]!;
        this.totalHeight.set(total);
        const el = this.viewport()?.nativeElement;
        if (el) {
            const max = Math.max(0, total - el.clientHeight);
            if (el.scrollTop > max) {
                el.scrollTop = max;
            }
        }
        this.updateWindowTransform();
    }

    private rowHeightAt(index: number): number {
        const items = this.items();
        const item = items[index];
        if (!item) {
            return this.estimateItemHeight();
        }
        const key = this.trackBy()(item, index);
        return this.heightCache.get(key) ?? this.estimateItemHeight();
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
            this.visibleRangeChange.emit({ start: 0, end: -1 });
            return;
        }

        const scrollTop = el.scrollTop;
        const vh = el.clientHeight;
        const bottom = scrollTop + vh;

        const first = this.findFirstVisible(scrollTop, n);
        const last = this.findLastVisible(bottom, n);
        const os = this.overscan();
        const start = Math.max(0, first - os);
        const end = Math.min(n - 1, last + os);

        if (this.windowStart() !== start) {
            this.windowStart.set(start);
        }

        const tb = this.trackBy();
        const rows: Array<{ item: T; index: number; trackKey: unknown }> = [];
        for (let i = start; i <= end; i++) {
            const item = items[i]!;
            rows.push({ item, index: i, trackKey: tb(item, i) });
        }
        this.visibleRows.set(rows);
        this.updateWindowTransform();
        this.visibleRangeChange.emit({ start, end });
    }

    private updateWindowTransform(): void {
        const start = this.windowStart();
        const offset = this.prefix[start] ?? 0;
        this.windowTransform.set(`translate3d(0,${offset}px,0)`);
    }
}
