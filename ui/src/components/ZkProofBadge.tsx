import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZkProofBadgeProps {
  className?: string;
}

export function ZkProofBadge({ className }: ZkProofBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono',
      'bg-green-500/20 text-green-400 border border-green-500/30',
      className
    )}>
      <ShieldCheck className="h-3 w-3" />
      ZK-VERIFIED
    </span>
  );
}
