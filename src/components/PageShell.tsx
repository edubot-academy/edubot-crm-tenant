import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ky } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end md:self-start">{actions}</div>}
    </div>
  );
}

interface StatePanelProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function StatePanel({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  compact = false,
  className,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card text-center shadow-card',
        compact ? 'min-h-32 px-4 py-8' : 'min-h-64 px-6 py-12',
        className,
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      {title && <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>}
      {message && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>}
      {onAction && (
        <Button variant="outline" size={compact ? 'sm' : 'default'} className="mt-4" onClick={onAction}>
          {actionLabel || ky.common.retry}
        </Button>
      )}
    </div>
  );
}

export function PageLoading() {
  return (
    <StatePanel
      title={ky.common.loading}
      message="Маалыматтар даярдалып жатат."
      icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
      className="border-dashed"
    />
  );
}

export function PageError({
  message,
  onRetry,
  actionLabel,
}: {
  message?: string;
  onRetry?: () => void;
  actionLabel?: string;
}) {
  return (
    <StatePanel
      title="Маалыматтарды жүктөө мүмкүн болгон жок"
      message={message || ky.common.error}
      icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
      onAction={onRetry}
      actionLabel={actionLabel}
    />
  );
}

export function PageEmpty({ message }: { message?: string }) {
  return (
    <StatePanel
      title="Маалымат табылган жок"
      message={message || ky.common.noData}
      icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
      className="border-dashed"
    />
  );
}
