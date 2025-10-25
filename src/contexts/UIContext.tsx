/**
 * UIContext - Manages UI state (dialogs, panels, view preferences)
 * Extracted from DatabaseContext for better separation of concerns
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import type { ImportSuccessData } from '@/components/import/UploadFileDialog';

/**
 * View types
 */
export type ViewType = 'table' | 'calendar' | 'kanban' | 'gallery';

/**
 * UI context type
 */
export interface UIContextType {
  // View type
  viewType: ViewType;
  setViewType: (type: ViewType) => void;

  // Dialogs
  showClearDialog: boolean;
  showDeleteDialog: boolean;
  isUploadDialogOpen: boolean;
  showSuccessScreen: boolean;
  importSuccessData: ImportSuccessData | null;
  setShowClearDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setIsUploadDialogOpen: (open: boolean) => void;
  setShowSuccessScreen: (show: boolean) => void;
  setImportSuccessData: (data: ImportSuccessData | null) => void;

  // Panels
  showFilters: boolean;
  showAIChat: boolean;
  showInsights: boolean;
  showCollabPanel: boolean;
  setShowFilters: (show: boolean) => void;
  setShowAIChat: (show: boolean) => void;
  setShowInsights: (show: boolean) => void;
  setShowCollabPanel: (show: boolean) => void;

  // Utility functions
  closeAllDialogs: () => void;
  closeAllPanels: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * Provider props
 */
interface UIProviderProps {
  children: ReactNode;
}

/**
 * UI Provider - Manages all UI state
 */
export function UIProvider({ children }: UIProviderProps) {
  // View type
  const [viewType, setViewType] = useState<ViewType>('table');

  // Dialogs
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [importSuccessData, setImportSuccessData] = useState<ImportSuccessData | null>(null);

  // Panels
  const [showFilters, setShowFilters] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  /**
   * Close all dialogs
   */
  const closeAllDialogs = () => {
    setShowClearDialog(false);
    setShowDeleteDialog(false);
    setIsUploadDialogOpen(false);
    setShowSuccessScreen(false);
    setImportSuccessData(null);
  };

  /**
   * Close all panels
   */
  const closeAllPanels = () => {
    setShowFilters(false);
    setShowAIChat(false);
    setShowInsights(false);
    setShowCollabPanel(false);
  };

  const value: UIContextType = {
    viewType,
    setViewType,
    showClearDialog,
    showDeleteDialog,
    isUploadDialogOpen,
    showSuccessScreen,
    importSuccessData,
    setShowClearDialog,
    setShowDeleteDialog,
    setIsUploadDialogOpen,
    setShowSuccessScreen,
    setImportSuccessData,
    showFilters,
    showAIChat,
    showInsights,
    showCollabPanel,
    setShowFilters,
    setShowAIChat,
    setShowInsights,
    setShowCollabPanel,
    closeAllDialogs,
    closeAllPanels,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Hook to use UIContext
 */
export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
