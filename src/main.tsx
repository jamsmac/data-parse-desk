import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry, SentryErrorBoundary } from "./lib/sentry";

// Initialize Sentry before rendering the app
initSentry();

// Error fallback component
const ErrorFallback = ({ error, resetError }: any) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center p-8 max-w-md">
      <h1 className="text-2xl font-bold text-destructive mb-4">Что-то пошло не так</h1>
      <p className="text-muted-foreground mb-4">
        Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
      </p>
      <details className="text-left mb-4 p-4 bg-muted rounded-lg">
        <summary className="cursor-pointer font-medium">Подробности ошибки</summary>
        <pre className="mt-2 text-xs overflow-auto">{error?.message || "Unknown error"}</pre>
      </details>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
      >
        Попробовать снова
      </button>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SentryErrorBoundary fallback={ErrorFallback} showDialog>
      <App />
    </SentryErrorBoundary>
  </StrictMode>
);
