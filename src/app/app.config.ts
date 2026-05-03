import {
    APP_INITIALIZER,
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { UrlStateSyncService } from './store/url-state-sync.service';

/** Eagerly construct URL sync before components so the store hydrates from the address bar. */
function urlStateSyncFactory(_sync: UrlStateSyncService): () => Promise<void> {
    return () => Promise.resolve();
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes),
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [UrlStateSyncService],
            useFactory: urlStateSyncFactory,
        },
    ],
};
