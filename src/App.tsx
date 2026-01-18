import { MatrixProvider } from "./contexts/MatrixContext";
import { MatrixEditor } from "./components/matrix/MatrixEditor";

function App() {
  return (
    <MatrixProvider>
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
            <MatrixEditor />
          </div>
        </main>
      </div>
    </MatrixProvider>
  );
}

export default App;
