import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { routes } from '../../app.routes';
import { AppStore } from './app.store';
import { UrlStateSyncService } from './url-state-sync.service';

describe('UrlStateSyncService', () => {
  it('restores users, search, and sort from query params after navigation', async () => {
    TestBed.configureTestingModule({
      providers: [AppStore, UrlStateSyncService, provideRouter(routes)],
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

  it('restores first visible post id from `post` query param', async () => {
    TestBed.configureTestingModule({
      providers: [AppStore, UrlStateSyncService, provideRouter(routes)],
    });

    const router = TestBed.inject(Router);
    await router.navigate(['/'], {
      queryParams: { sort: 'recent', post: '42' },
    });

    TestBed.inject(UrlStateSyncService);

    const store = TestBed.inject(AppStore);
    expect(store.leadFirstVisiblePostId()).toBe(42);
    expect(store.pendingScrollToLeadPostId()).toBe(42);
  });

  it('still reads legacy `lead` query param when `post` is absent', async () => {
    TestBed.configureTestingModule({
      providers: [AppStore, UrlStateSyncService, provideRouter(routes)],
    });

    const router = TestBed.inject(Router);
    await router.navigate(['/'], {
      queryParams: { sort: 'recent', lead: '7' },
    });

    TestBed.inject(UrlStateSyncService);

    const store = TestBed.inject(AppStore);
    expect(store.leadFirstVisiblePostId()).toBe(7);
    expect(store.pendingScrollToLeadPostId()).toBe(7);
  });
});
