import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Eagerly load critical pages for better UX
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";

// Lazy load heavy/less-frequently accessed pages
const DatabaseView = lazy(() => import("./pages/DatabaseView"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
      <p className="text-muted-foreground">Загрузка страницы...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 минута
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes - Eagerly loaded for fast access */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes - Mix of eager and lazy loading */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />

              {/* Heavy pages - Lazy loaded to reduce initial bundle */}
              <Route
                path="/database/:id"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <DatabaseView />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Analytics />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Reports />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ProfilePage />
                      </Suspense>
                    }
                  />
                }
              />

              {/* Catch-all route - Lazy loaded */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFound />
                  </Suspense>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
