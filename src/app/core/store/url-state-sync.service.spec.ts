import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AppStore } from './app.store';
import { UrlStateSyncService } from './url-state-sync.service';

describe('UrlStateSyncService', () => {
  it('restores users, search, and sort from query params after navigation', async () => {
    TestBed.configureTestingModule({
      providers: [AppStore, UrlStateSyncService, provideRouter([])],
    });

    const router = TestBed.inject(Router);
    await router.navigate(['/'], {
      queryParams: { users: '10,20', search: 'zebra', sort: 'title' },
    });

    TestBed.inject(UrlStateSyncService);

    const store = TestBed.inject(AppStore);
    expect(store.usersSelected()).toEqual(new Set([10, 20]));
    expect(store.postSearch()).toBe('zebra');
    expect(store.sort()).toBe('title');
  });
});
