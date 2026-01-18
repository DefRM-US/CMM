import { useState, useCallback, useContext } from "react";
import { MatrixProvider, MatrixContext } from "./contexts/MatrixContext";
import { MatrixEditor } from "./components/matrix/MatrixEditor";
import { ImportTab } from "./components/import/ImportTab";
import { ExportTab } from "./components/export/ExportTab";
import { ComparisonTab } from "./components/comparison";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs";
import { useActiveMatrix } from "./hooks/useActiveMatrix";
import { useMatrices } from "./hooks/useMatrices";

type TabValue = "editor" | "import" | "export" | "comparison";

/**
 * Main app content - must be inside MatrixProvider to use context
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("editor");
  const { activeMatrix, selectMatrix } = useActiveMatrix();
  const { loadMatrices } = useMatrices();
  const context = useContext(MatrixContext);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Capability Matrix Management
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
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
    <MatrixProvider>
      <AppContent />
    </MatrixProvider>
  );
}

export default App;
