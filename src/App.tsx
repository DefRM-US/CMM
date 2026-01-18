import { useState, useCallback, useContext } from "react";
import { MatrixProvider, MatrixContext } from "./contexts/MatrixContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MatrixEditor } from "./components/matrix/MatrixEditor";
import { ImportTab } from "./components/import/ImportTab";
import { ExportTab } from "./components/export/ExportTab";
import { ComparisonTab } from "./components/comparison";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs";
import { useActiveMatrix } from "./hooks/useActiveMatrix";
import { useMatrices } from "./hooks/useMatrices";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

type TabValue = "editor" | "import" | "export" | "comparison";

/**
 * Main app content - must be inside MatrixProvider to use context
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("editor");
  const { activeMatrix, selectMatrix } = useActiveMatrix();
  const { loadMatrices } = useMatrices();
  const context = useContext(MatrixContext);
  const { theme, toggleTheme } = useTheme();

  /**
   * Handle when an import is completed
   * - Reload matrices to include the new one
   * - Switch to editor tab
   * - Select the imported matrix
   */
  const handleImportComplete = useCallback(
    async (matrixId: string) => {
      // Reload matrices list to include the new import
      await loadMatrices();

      // Add the new matrix to the state
      if (context) {
        // We need to refresh - the loadMatrices should handle this
      }

      // Switch to editor tab and select the imported matrix
      setActiveTab("editor");
      await selectMatrix(matrixId);
    },
    [loadMatrices, selectMatrix, context]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Capability Matrix Management
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="comparison">Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <MatrixEditor />
            </TabsContent>

            <TabsContent value="import">
              <ImportTab
                activeMatrix={activeMatrix}
                onImportComplete={handleImportComplete}
              />
            </TabsContent>

            <TabsContent value="export">
              <ExportTab activeMatrix={activeMatrix} />
            </TabsContent>

            <TabsContent value="comparison">
              <ComparisonTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <MatrixProvider>
            <AppContent />
          </MatrixProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
