import { Routes } from '@angular/router';

import { authGuard, nutritionistGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.RegisterPage) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'add-meal', loadComponent: () => import('./pages/add-meal/add-meal').then((m) => m.AddMealPage) },
      { path: 'dishes', loadComponent: () => import('./pages/dishes/dishes').then((m) => m.DishesPage) },
      { path: 'history', loadComponent: () => import('./pages/history/history').then((m) => m.HistoryPage) },
      { path: 'search', loadComponent: () => import('./pages/search/search').then((m) => m.SearchPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage) },
      {
        path: 'recommendations',
        loadComponent: () => import('./pages/recommendations/recommendations').then((m) => m.RecommendationsPage),
      },
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
