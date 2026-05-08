import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'editor/:id',
    loadComponent: () => import('./features/editor/editor.component').then(m => m.EditorComponent),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];