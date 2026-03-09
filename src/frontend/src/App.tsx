import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useActor } from "./hooks/useActor";
import AnalyzeChart from "./pages/AnalyzeChart";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import LoginPage from "./pages/LoginPage";
import ProcessingScreen from "./pages/ProcessingScreen";
import Results from "./pages/Results";
import Settings from "./pages/Settings";

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const analyzeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analyze",
  component: AnalyzeChart,
});

const processingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/processing",
  component: ProcessingScreen,
});

// Route without param — used by the new Results page (data via sessionStorage)
const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/results/$id",
  component: Results,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: History,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
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

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppContent() {
  const { isAuthenticated, setActor } = useAuth();
  const { actor } = useActor();

  // Wire the actor into AuthContext so it can sync user data to backend
  useEffect(() => {
    setActor(actor as Parameters<typeof setActor>[0]);
  }, [actor, setActor]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
