import { Routes } from '@angular/router';

import { authGuard, nutritionistGuard, userOnlyGuard } from './core/auth.guard';

// authGuard (parent) runs first and loads the user, so the role guards below always know the role.
// "/" and unknown URLs go to /dashboard; userOnlyGuard sends nutritionists on to /clients.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.RegisterPage) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      // Regular users only
      {
        path: 'dashboard',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'add-meal',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./pages/add-meal/add-meal').then((m) => m.AddMealPage),
      },
      {
        path: 'history',
        canActivate: [userOnlyGuard],
        loadComponent: () => import('./pages/history/history').then((m) => m.HistoryPage),
      },
      // Everyone
      { path: 'dishes', loadComponent: () => import('./pages/dishes/dishes').then((m) => m.DishesPage) },
      { path: 'search', loadComponent: () => import('./pages/search/search').then((m) => m.SearchPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage) },
      {
        path: 'recommendations',
        loadComponent: () => import('./pages/recommendations/recommendations').then((m) => m.RecommendationsPage),
      },
      // Nutritionists only
      {
        path: 'clients',
        canActivate: [nutritionistGuard],
        loadComponent: () => import('./pages/clients/clients').then((m) => m.ClientsPage),
      },
      {
        path: 'clients/:id',
        canActivate: [nutritionistGuard],
        loadComponent: () => import('./pages/client-detail/client-detail').then((m) => m.ClientDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
