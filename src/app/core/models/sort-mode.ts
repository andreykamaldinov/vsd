export type PostSortMode = 'recent' | 'title';

export function parseSortMode(value: string | null | undefined): PostSortMode {
  return value === 'title' ? 'title' : 'recent';
}
