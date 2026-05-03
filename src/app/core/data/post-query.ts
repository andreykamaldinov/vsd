import type { Post } from '../models/post.model';
import type { PostSortMode } from '../models/sort-mode';

export function filterPosts(
  posts: readonly Post[],
  selectedUserIds: ReadonlySet<number>,
  searchRaw: string,
): Post[] {
  const q = searchRaw.trim().toLowerCase();
  const useUserFilter = selectedUserIds.size > 0;

  const out: Post[] = [];
  for (const p of posts) {
    if (useUserFilter && !selectedUserIds.has(p.userId)) {
      continue;
    }
    if (q.length > 0) {
      const t = p.title.toLowerCase();
      const b = p.body.toLowerCase();
      if (!t.includes(q) && !b.includes(q)) {
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

export function sortPosts(posts: readonly Post[], mode: PostSortMode): Post[] {
  const copy = posts.slice();
  if (mode === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else {
    copy.sort((a, b) => b.createdAt - a.createdAt);
  }
  return copy;
}

export function filterAndSortPosts(
  posts: readonly Post[],
  selectedUserIds: ReadonlySet<number>,
  searchRaw: string,
  mode: PostSortMode,
): Post[] {
  return sortPosts(filterPosts(posts, selectedUserIds, searchRaw), mode);
}
