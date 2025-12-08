import { Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EncryptedIndicatorProps {
  className?: string;
  showDescription?: boolean;
}

export function EncryptedIndicator({ className, showDescription = false }: EncryptedIndicatorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20">
        <Lock className="h-4 w-4 text-purple-400" />
        <span className="font-mono text-sm text-purple-400 tracking-wider">ENCRYPTED</span>
        <ShieldCheck className="h-4 w-4 text-purple-400" />
      </div>
      {showDescription && (
        <p className="text-xs text-muted-foreground text-center">
          Bet positions are encrypted until market resolution
        </p>
      )}
    </div>
  );
}

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
