import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallPWA as InstallPWAPrompt } from "@/components/pwa/InstallPWA";
import { ErrorBoundary } from "@/lib/errorBoundary";
import { AnnouncementProvider } from "@/components/accessibility/LiveAnnouncer";

// Eagerly load only auth pages for fastest initial load
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Lazy load all other pages to reduce initial bundle
const Projects = lazy(() => import("./pages/Projects"));
const ProjectView = lazy(() => import("./pages/ProjectView"));
const DatabaseView = lazy(() => import("./pages/DatabaseView"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Settings = lazy(() => import("./pages/Settings"));
const Integrations = lazy(() => import("./pages/Integrations"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const ImportHistory = lazy(() => import("./pages/ImportHistory"));
const TemplateMarketplace = lazy(() => import("./pages/TemplateMarketplace"));
const Admin = lazy(() => import("./pages/Admin"));
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AnnouncementProvider>
            <NotificationProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <InstallPWAPrompt />
              <BrowserRouter>
                <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
              {/* Public routes - Eagerly loaded for fast access */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/install" element={<Suspense fallback={<PageLoader />}><InstallPWA /></Suspense>} />

              {/* Protected routes - All lazy loaded for optimal bundle size */}
              <Route path="/" element={<Navigate to="/projects" replace />} />
              
              <Route
                path="/projects"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Projects />
                      </Suspense>
                    }
                  />
                }
              />

              <Route
                path="/projects/:projectId"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ProjectView />
                      </Suspense>
                    }
                  />
                }
              />

              <Route
                path="/projects/:projectId/database/:databaseId"
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
              <Route
                path="/settings"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Settings />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/integrations"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Integrations />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/advanced-analytics"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AdvancedAnalytics />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/projects/:projectId/database/:databaseId/import-history"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ImportHistory />
                      </Suspense>
                    }
                  />
                }
              />
              <Route
                path="/marketplace"
                element={
                  <ProtectedRoute
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <TemplateMarketplace />
                      </Suspense>
                    }
                  />
                }
              />

              {/* Admin route - Requires admin role */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    requireRole="admin"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Admin />
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
            </NotificationProvider>
          </AnnouncementProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
