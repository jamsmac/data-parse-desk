/**
 * Lazy Loaded Heavy Components
 * Оптимизация: code splitting для тяжелых компонентов
 */

import { lazy } from 'react';

// Charts - загружаются только при использовании
export const ChartBuilder = lazy(() =>
  import('@/components/charts/ChartBuilder')
    .then(module => ({ default: module.ChartBuilder }))
);

export const ChartGallery = lazy(() =>
  import('@/components/charts/ChartGallery')
    .then(module => ({ default: module.ChartGallery }))
);

export const DashboardBuilder = lazy(() =>
  import('@/components/charts/DashboardBuilder')
    .then(module => ({ default: module.DashboardBuilder }))
);

export const ExportDialog = lazy(() =>
  import('@/components/charts/ExportDialog')
    .then(module => ({ default: module.ExportDialog }))
);

export const BatchExportDialog = lazy(() =>
  import('@/components/charts/BatchExportDialog')
    .then(module => ({ default: module.BatchExportDialog }))
);

// Relations - тяжелый компонент с визуализацией графов
export const RelationshipGraph = lazy(() =>
  import('@/components/relations/RelationshipGraph')
    .then(module => ({ default: module.RelationshipGraph }))
);

// Database dialogs - загружаются по требованию
export const CloneDatabaseDialog = lazy(() =>
  import('@/components/database/CloneDatabaseDialog')
    .then(module => ({ default: module.CloneDatabaseDialog }))
);

export const DatabaseVersionsDialog = lazy(() =>
  import('@/components/database/DatabaseVersionsDialog')
    .then(module => ({ default: module.DatabaseVersionsDialog }))
);

export const FormulaEditor = lazy(() =>
  import('@/components/database/FormulaEditor')
    .then(module => ({ default: module.FormulaEditor }))
);

// Reports - загружаются только при переходе на страницу
export const ScheduledReports = lazy(() =>
  import('@/components/reports/ScheduledReports')
    .then(module => ({ default: module.ScheduledReports }))
);

// Settings components - загружаются по требованию
export const NotificationPreferences = lazy(() =>
  import('@/components/settings/NotificationPreferences')
    .then(module => ({ default: module.NotificationPreferences }))
);

export const SecuritySettings = lazy(() =>
  import('@/components/settings/SecuritySettings')
    .then(module => ({ default: module.SecuritySettings }))
);

export const AppearanceSettings = lazy(() =>
  import('@/components/settings/AppearanceSettings')
    .then(module => ({ default: module.AppearanceSettings }))
);

export const DatabaseSettings = lazy(() =>
  import('@/components/settings/DatabaseSettings')
    .then(module => ({ default: module.DatabaseSettings }))
);

// Email components - загружаются при использовании
export const EmailSettings = lazy(() =>
  import('@/components/collaboration/EmailSettings')
    .then(module => ({ default: module.EmailSettings }))
);