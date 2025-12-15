import { Badge } from '@/components/ui/badge';
import type { MarketStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: MarketStatus;
  className?: string;
}

const statusConfig: Record<MarketStatus, { label: string; className: string }> = {
  preparing: {
    label: 'PREPARING',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  active: {
    label: 'LIVE',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  expired: {
    label: 'AWAITING RESOLUTION',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  resolved: {
    label: 'RESOLVED',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-mono text-xs uppercase tracking-wider',
        config.className,
        className
      )}
    >
      {status === 'active' && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
