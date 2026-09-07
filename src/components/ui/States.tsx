import { Loader2, AlertTriangle, Inbox } from "lucide-react";

export function LoadingState({ label = "Loading dashboard data…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-24 text-ink-secondary"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-status-critical/30 bg-status-critical/5 py-16 px-6 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-status-critical" aria-hidden="true" />
      <p className="text-sm font-medium text-ink max-w-md">Couldn&apos;t load dashboard data</p>
      <p className="text-sm text-ink-secondary max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-ink-secondary">
      <Inbox className="h-8 w-8" aria-hidden="true" />
      <p className="text-sm max-w-md">{message}</p>
    </div>
  );
}
