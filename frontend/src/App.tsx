import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AnalyzeChart from './pages/AnalyzeChart';
import ProcessingScreen from './pages/ProcessingScreen';
import Results from './pages/Results';
import History from './pages/History';
import Settings from './pages/Settings';

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const analyzeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analyze',
  component: AnalyzeChart,
});

const processingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/processing',
  component: ProcessingScreen,
});

// Route without param — used by the new Results page (data via sessionStorage)
const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results/$id',
  component: Results,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: History,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  analyzeRoute,
  processingRoute,
  resultsRoute,
  historyRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
