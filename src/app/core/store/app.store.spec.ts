import { TestBed } from '@angular/core/testing';

import { AppStore } from './app.store';

describe('AppStore', () => {
  it('applyFromQueryParams parses users, search, and sort', () => {
    TestBed.configureTestingModule({ providers: [AppStore] });
    const store = TestBed.inject(AppStore);
    store.applyFromQueryParams('12,45,901', 'angular', 'recent');
    expect(store.usersSelected()).toEqual(new Set([12, 45, 901]));
    expect(store.postSearch()).toBe('angular');
    expect(store.sort()).toBe('recent');
  });
});
