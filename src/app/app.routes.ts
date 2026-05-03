import { Routes } from '@angular/router';

import { Home } from './home.component';

/** Deep link: `?users=…&search=…&sort=…&post=…` (see UrlStateSyncService). */
export const routes: Routes = [{ path: '', pathMatch: 'full', component: Home }];
