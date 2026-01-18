import { DocumentPlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";

interface EmptyStateProps {
  onCreateMatrix: () => void;
}

export function EmptyState({ onCreateMatrix }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-[var(--muted)] rounded-full p-4 mb-4">
        <DocumentPlusIcon className="w-12 h-12 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        No matrices yet
      </h3>
      <p className="text-[var(--muted-foreground)] text-center mb-6 max-w-md">
        Create your first capability matrix to start tracking requirements and
        rating your company's capabilities.
      </p>
      <Button onClick={onCreateMatrix} variant="primary">
        Create Your First Matrix
      </Button>
    </div>
  );
}
