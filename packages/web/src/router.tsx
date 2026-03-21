import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/auth-guard';
import { FeatureGuard } from '@/components/shared/feature-guard';
import { AppLayout } from '@/components/layout/app-layout';
import { RouteErrorPage } from './routes/route-error';
import { LazyRoute } from './routes/shared';
import { appRoutes } from './routes/app-routes';
import { POSPage, KDSPage, RegisterPage, VerifyEmailPage, StorefrontPage } from './routes/lazy-imports';

// Public pages (eager loading for fast initial load)
import { LoginPage } from '@/features/auth/login-page';
import { LandingPage } from '@/pages/landing-page';
import { PricingPage } from '@/pages/pricing-page';
import { CustomerSelfOrderPage } from '@/features/self-order/customer-self-order-page';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/pricing', element: <PricingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <LazyRoute><RegisterPage /></LazyRoute> },
  { path: '/auth/verify-email', element: <LazyRoute><VerifyEmailPage /></LazyRoute> },
  { path: '/order/:sessionCode', element: <CustomerSelfOrderPage /> },
  { path: '/store/:slug', element: <LazyRoute><StorefrontPage /></LazyRoute> },

  // POS & KDS (fullscreen, no sidebar)
  {
    path: '/pos',
    errorElement: <RouteErrorPage />,
    element: <AuthGuard><LazyRoute><POSPage /></LazyRoute></AuthGuard>,
  },
  {
    path: '/kds',
    errorElement: <RouteErrorPage />,
    element: <AuthGuard><FeatureGuard path="/kds"><LazyRoute><KDSPage /></LazyRoute></FeatureGuard></AuthGuard>,
  },

  // Backoffice (with sidebar layout)
  {
    path: '/app',
    errorElement: <RouteErrorPage />,
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: appRoutes,
  },

  // Catch-all
  { path: '*', element: <Navigate to="/app" replace /> },
]);
