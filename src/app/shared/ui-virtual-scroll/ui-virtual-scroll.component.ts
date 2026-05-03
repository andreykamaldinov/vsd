import { NgTemplateOutlet } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
    TemplateRef,
    untracked,
    viewChild,
} from '@angular/core';

import {
    buildVirtualScrollHeaderText,
    computeVirtualScrollLayout,
    getVisibleViewport,
    sliceVirtualScrollItems,
    type VirtualScrollViewItem,
} from './virtual-scroll-range';

@Component({
    selector: 'app-ui-virtual-scroll',
    imports: [NgTemplateOutlet],
    templateUrl: './ui-virtual-scroll.component.html',
    styleUrl: './ui-virtual-scroll.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiVirtualScrollComponent<T = unknown> {
    public readonly items = input.required<readonly T[]>();
    public readonly itemHeight = input.required<number>();
    public readonly height = input<number | string>(400);
    public readonly buffer = input(5);
    public readonly itemLabelSingular = input('item');
    public readonly itemLabelPlural = input('items');

    public readonly headerSummaryChange = output<string>();

    public readonly itemTemplate =
        contentChild<TemplateRef<{ $implicit: T; index: number }>>('itemTemplate');

    public readonly viewportHeightCss = computed((): string | null => {
        const h = this.height();
        if (typeof h === 'number') {
            return `${String(h)}px`;
        }
        return h;
    });

    public readonly totalScrollHeight = computed(() => this._layout().totalHeight);

    public readonly visibleViewItems = computed((): readonly VirtualScrollViewItem<T>[] =>
        sliceVirtualScrollItems(this.items(), this._layout())
    );

    public readonly headerCountText = computed(() => {
        const vp = this._visibleViewportLogical();
        return buildVirtualScrollHeaderText({
            visibleStartIndex: vp.startIndex,
            visibleCount: vp.count,
            totalCount: this.items().length,
            itemLabelSingular: this.itemLabelSingular(),
            itemLabelPlural: this.itemLabelPlural(),
        });
    });

    public readonly contentTransform = computed(
        () => `translateY(${String(this._layout().offsetY)}px)`
    );

    private readonly _scrollTop = signal(0);
    private readonly _measuredViewportHeightPx = signal(1);

    private readonly _destroyRef = inject(DestroyRef);
    private readonly _injector = inject(Injector);
    private readonly _viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

    private _lastEmittedHeaderSummary = '';

    private readonly _viewportHeightPx = computed(() => {
        const hIn = this.height();
        if (typeof hIn === 'number') {
            return Math.max(1, Math.round(hIn));
        }
        return Math.max(1, this._measuredViewportHeightPx());
    });

    private readonly _layout = computed(() =>
        computeVirtualScrollLayout(
            this.items().length,
            this.itemHeight(),
            this._scrollTop(),
            this._viewportHeightPx(),
            this.buffer()
        )
    );

    private readonly _visibleViewportLogical = computed(() =>
        getVisibleViewport({
            scrollTop: this._scrollTop(),
            viewportHeight: this._viewportHeightPx(),
            itemHeight: this.itemHeight(),
            totalCount: this.items().length,
        })
    );

    public constructor() {
        afterNextRender(
            () => {
                afterNextRender(
                    () => {
                        untracked(() => {
                            this._syncMeasuredViewportHeightFromDom();
                        });
                    },
                    { injector: this._injector }
                );
            },
            { injector: this._injector }
        );

        effect(() => {
            this.height();
            this._viewportRef();
            if (typeof this.height() === 'number') {
                return;
            }
            untracked(() => {
                this._syncMeasuredViewportHeightFromDom();
            });
        });

        effect(() => {
            const text = this.headerCountText();
            untracked(() => {
                if (text === this._lastEmittedHeaderSummary) {
                    return;
                }
                this._lastEmittedHeaderSummary = text;
                this.headerSummaryChange.emit(text);
            });
        });

        const onResize = (): void => {
            untracked(() => {
                this._syncMeasuredViewportHeightFromDom();
            });
        };
        if (typeof globalThis.window !== 'undefined') {
            globalThis.window.addEventListener('resize', onResize, { passive: true });
            this._destroyRef.onDestroy(() => {
                globalThis.window.removeEventListener('resize', onResize);
            });
        }
    }

    public onScroll(event: Event): void {
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const next = target.scrollTop;
        if (next === this._scrollTop()) {
            return;
        }
        this._scrollTop.set(next);
    }

    public scrollByItems(deltaItems: number, behavior: ScrollBehavior = 'auto'): void {
        if (deltaItems === 0) {
            return;
        }
        const viewport = this._viewportRef()?.nativeElement;
        if (!viewport) {
            return;
        }
        const itemHeight = this.itemHeight();
        if (itemHeight <= 0) {
            return;
        }
        const deltaPx = deltaItems * itemHeight;
        const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const nextTop = Math.min(Math.max(0, viewport.scrollTop + deltaPx), maxTop);
        viewport.scrollTo({ top: nextTop, behavior });
    }

    public getFirstVisibleItemIndex(): number {
        const viewport = this._viewportRef()?.nativeElement;
        const itemHeight = this.itemHeight();
        const count = this.items().length;
        if (!viewport || itemHeight <= 0 || count <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(count - 1, Math.floor(viewport.scrollTop / itemHeight)));
    }

    private _syncMeasuredViewportHeightFromDom(): void {
        if (typeof this.height() === 'number') {
            return;
        }
        const el = this._viewportRef()?.nativeElement;
        if (!(el instanceof HTMLElement)) {
            return;
        }
        const raw = el.clientHeight;
        if (raw < 1) {
            return;
        }
        const next = Math.max(1, Math.round(raw));
        if (next === this._measuredViewportHeightPx()) {
            return;
        }
        this._measuredViewportHeightPx.set(next);
    }
}
