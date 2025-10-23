import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeMonitoring } from "./lib/monitoring";
import { initSentry } from "./lib/sentry";

// Initialize Sentry for error tracking (production)
initSentry();

// Initialize performance monitoring and error tracking
initializeMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
