import { useState, useEffect } from "react";

function App() {
  const [dbStatus, setDbStatus] = useState<"loading" | "connected" | "error">("loading");

  useEffect(() => {
    // Database connection will be initialized here in Phase 2
    // For now, just simulate a connection check
    setDbStatus("connected");
  }, []);

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
        {/* Status indicator for Phase 1 verification */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Phase 1 Foundation Status
          </h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${
                dbStatus === "connected" ? "bg-green-500" :
                dbStatus === "error" ? "bg-red-500" : "bg-yellow-500"
              }`}></span>
              <span className="text-gray-700">
                Database: {dbStatus === "connected" ? "Ready" : dbStatus === "loading" ? "Connecting..." : "Error"}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-3 bg-green-500"></span>
              <span className="text-gray-700">Tailwind CSS: Configured</span>
            </div>
          </div>

          {/* Score badge preview */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Score Badge Preview:</h3>
            <div className="flex gap-2">
              <span className="score-badge score-badge-3">3</span>
              <span className="score-badge score-badge-2">2</span>
              <span className="score-badge score-badge-1">1</span>
              <span className="score-badge score-badge-0">0</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
