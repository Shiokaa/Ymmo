import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { agentGuard } from './core/guards/agent.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: 'agencies',
    loadComponent: () => import('./features/agencies/agencies').then((m) => m.Agencies),
  },
  {
    path: 'agencies/:id',
    loadComponent: () =>
      import('./features/agency-detail/agency-detail').then((m) => m.AgencyDetail),
  },
  {
    path: 'properties/:id',
    loadComponent: () =>
      import('./features/property-detail/property-detail').then((m) => m.PropertyDetail),
  },
  {
    path: 'estimate',
    loadComponent: () => import('./features/estimate/estimate').then((m) => m.Estimate),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'favorites',
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.Favorites),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'agent',
    canActivate: [agentGuard],
    loadComponent: () =>
      import('./features/agent/agent-layout/agent-layout').then((m) => m.AgentLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/agent/dashboard/dashboard').then((m) => m.AgentDashboard),
      },
      {
        path: 'properties',
        loadComponent: () =>
          import('./features/agent/property-list/property-list').then((m) => m.AgentPropertyList),
      },
      {
        path: 'properties/new',
        loadComponent: () =>
          import('./features/agent/property-form/property-form').then((m) => m.AgentPropertyForm),
      },
      {
        path: 'properties/:id/edit',
        loadComponent: () =>
          import('./features/agent/property-form/property-form').then((m) => m.AgentPropertyForm),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./features/agent/request-list/request-list').then((m) => m.AgentRequestList),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/agent/transaction-list/transaction-list').then(
            (m) => m.AgentTransactionList,
          ),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/agent/user-list/user-list').then((m) => m.AgentUserList),
      },
    ],
  },
  {
    path: 'my-requests',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-requests/my-requests').then((m) => m.MyRequests),
  },
  {
    path: 'my-transactions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-transactions/my-transactions').then((m) => m.MyTransactions),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
