import { AlertTriangle, RefreshCw } from "lucide-react";

interface QueryErrorBoxProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorBox({ message = "데이터를 불러오지 못했습니다.", onRetry }: QueryErrorBoxProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-negative/20 bg-negative/5 p-6 text-center">
      <AlertTriangle className="h-5 w-5 text-negative" />
      <p className="text-sm text-negative ">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-negative/10 px-3 py-1.5 text-xs font-medium text-negative hover:bg-negative/20 transition-colors "
        >
          <RefreshCw className="h-3 w-3" />
          다시 시도
        </button>
      )}
    </div>
  );
}
