export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export interface VisibleViewport {
    readonly startIndex: number;
    readonly count: number;
}

export function getVisibleViewport(params: {
    scrollTop: number;
    viewportHeight: number;
    itemHeight: number;
    totalCount: number;
}): VisibleViewport {
    const { scrollTop, viewportHeight, itemHeight, totalCount } = params;

    if (totalCount <= 0 || itemHeight <= 0 || viewportHeight <= 0) {
        return { startIndex: 0, count: 0 };
    }

    const startIndex = clamp(Math.floor(scrollTop / itemHeight), 0, totalCount);
    const maxVisibleCount = Math.ceil(viewportHeight / itemHeight);
    const count = clamp(maxVisibleCount, 0, totalCount - startIndex);

    return { startIndex, count };
}

export const VIRTUAL_SCROLL_NUMBER_FORMAT = new Intl.NumberFormat();

export function buildVirtualScrollHeaderText(options: {
    visibleStartIndex: number;
    visibleCount: number;
    totalCount: number;
    itemLabelSingular: string;
    itemLabelPlural: string;
}): string {
    const fmt = VIRTUAL_SCROLL_NUMBER_FORMAT;
    const { visibleStartIndex, visibleCount, totalCount, itemLabelSingular, itemLabelPlural } =
        options;

    if (totalCount <= 0 && visibleCount <= 0) {
        return `Showing ${fmt.format(0)} of ${fmt.format(0)} ${itemLabelPlural}`;
    }

    const label = visibleCount === 1 ? itemLabelSingular : itemLabelPlural;
    const last = visibleStartIndex + visibleCount;

    return `Showing ${fmt.format(last)} of ${fmt.format(totalCount)} ${label}`;
}

export interface VirtualScrollLayout {
    readonly startIndex: number;
    readonly endIndex: number;
    readonly offsetY: number;
    readonly totalHeight: number;
}

export function computeVirtualScrollLayout(
    itemCount: number,
    itemHeight: number,
    scrollTop: number,
    viewportHeight: number,
    buffer: number
): VirtualScrollLayout {
    if (itemCount <= 0 || itemHeight <= 0) {
        return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 };
    }

    const safeScrollTop = Math.max(0, scrollTop);
    const safeViewportHeight = Math.max(1, viewportHeight);
    const safeBuffer = Math.max(0, buffer);

    const startIndex = Math.max(0, Math.floor(safeScrollTop / itemHeight) - safeBuffer);
    const visibleCount = Math.ceil(safeViewportHeight / itemHeight) + safeBuffer * 2;
    const endIndex = Math.min(itemCount, startIndex + visibleCount);
    const offsetY = startIndex * itemHeight;
    const totalHeight = itemCount * itemHeight;

    return { startIndex, endIndex, offsetY, totalHeight };
}

export interface VirtualScrollViewItem<T> {
    readonly item: T;
    readonly index: number;
}

export function sliceVirtualScrollItems<T>(
    items: readonly T[],
    layout: VirtualScrollLayout
): readonly VirtualScrollViewItem<T>[] {
    if (layout.startIndex >= layout.endIndex) {
        return [];
    }
    const out: VirtualScrollViewItem<T>[] = [];
    for (let i = layout.startIndex; i < layout.endIndex; i++) {
        const item = items.at(i);
        if (item === undefined) {
            break;
        }
        out.push({ item, index: i });
    }
    return out;
}
