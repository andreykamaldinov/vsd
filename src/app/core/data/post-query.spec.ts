import { describe, expect, it } from 'vitest';

import type { Post } from '../models/post.model';
import { filterAndSortPosts, filterPosts, sortPosts } from './post-query';

const posts: Post[] = [
  {
    id: 1,
    userId: 10,
    title: 'Angular Virtual Scroll',
    body: 'Deep dive into performance tuning.',
    createdAt: 100,
    readTime: 5,
    tags: [],
  },
  {
    id: 2,
    userId: 20,
    title: 'Zebra Patterns',
    body: 'Stripes everywhere.',
    createdAt: 200,
    readTime: 3,
    tags: [],
  },
  {
    id: 3,
    userId: 10,
    title: 'TypeScript Tips',
    body: 'angular strict mode',
    createdAt: 150,
    readTime: 2,
    tags: [],
  },
];

describe('post-query', () => {
  it('filterPosts: empty selection shows all', () => {
    const r = filterPosts(posts, new Set(), '');
    expect(r).toHaveLength(3);
  });

  it('filterPosts: selection filters by userId', () => {
    const r = filterPosts(posts, new Set([10]), '');
    expect(r.map((p) => p.id).sort()).toEqual([1, 3]);
  });

  it('filterPosts: search is case-insensitive on title and body', () => {
    const r = filterPosts(posts, new Set(), 'ANGULAR');
    expect(r.map((p) => p.id).sort()).toEqual([1, 3]);
  });

  it('sortPosts: recent is newest first', () => {
    const r = sortPosts(posts, 'recent');
    expect(r.map((p) => p.id)).toEqual([2, 3, 1]);
  });

  it('sortPosts: title is alphabetical', () => {
    const r = sortPosts(posts, 'title');
    expect(r.map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it('filterAndSortPosts combines rules', () => {
    const r = filterAndSortPosts(posts, new Set([10]), 'typescript', 'title');
    expect(r.map((p) => p.id)).toEqual([3]);
  });
});
