import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="p-6 lg:p-8">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center max-w-md mx-auto">
        <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-rose-800">Khong tai duoc du lieu</p>
        <p className="text-xs text-rose-600 mt-1 break-words">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Thu lai
          </button>
        )}
      </div>
    </div>
  );
}
