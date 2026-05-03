import { describe, expect, it } from 'vitest';

import { commentCountForPost } from './fake-data.generator';

describe('fake-data.generator', () => {
  it('commentCountForPost is always between 2 and 15 inclusive', () => {
    for (let id = 1; id <= 5000; id++) {
      const n = commentCountForPost(id);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(15);
    }
  });
});
