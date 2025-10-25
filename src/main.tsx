import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeMonitoring } from "./lib/monitoring";
import { initSentry } from "./lib/sentry";
import { validateEnv, logEnvInfo } from "./config/env";

// Validate environment variables before starting the app
try {
  validateEnv();
  logEnvInfo();
} catch (error) {
  console.error('❌ Environment validation failed:', error);

  // Show user-friendly error page
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
      ">
        <div style="
          max-width: 600px;
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        ">
          <h1 style="color: #dc2626; margin-bottom: 1rem; font-size: 1.5rem;">
            ⚠️ Configuration Error
          </h1>
          <p style="color: #374151; margin-bottom: 1rem; line-height: 1.6;">
            The application could not start due to missing or invalid environment variables.
          </p>
          <pre style="
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 0.25rem;
            overflow-x: auto;
            font-size: 0.875rem;
            color: #1f2937;
            white-space: pre-wrap;
          ">${error instanceof Error ? error.message : String(error)}</pre>
          <p style="color: #6b7280; margin-top: 1rem; font-size: 0.875rem;">
            Please check your <code>.env</code> file and ensure all required variables are set.
            See <code>.env.example</code> for reference.
          </p>
        </div>
      </div>
    `;
  }
  throw error;
}

// Initialize Sentry for error tracking (production)
initSentry();

// Initialize performance monitoring and error tracking
initializeMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
