import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { mockUserBets } from '@/lib/mock-data';
import { formatAmount, formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useWallet } from '@/contexts/useWallet';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface BetHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-400', icon: Clock },
  won: { label: 'Won', className: 'bg-green-500/20 text-green-400', icon: TrendingUp },
  lost: { label: 'Lost', className: 'bg-red-500/20 text-red-400', icon: TrendingDown },
};

export function BetHistoryDialog({ open, onOpenChange }: BetHistoryDialogProps) {
  const { isConnected } = useWallet();

  if (!isConnected) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your Bet History</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {mockUserBets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No bets placed yet
            </p>
          ) : (
            mockUserBets.map((bet) => {
              const config = statusConfig[bet.status];
              const Icon = config.icon;
              return (
                <Link
                  key={bet.id}
                  to={`/market/${bet.marketId}`}
                  onClick={() => onOpenChange(false)}
                  className="block"
                >
                  <div className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors bg-card/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium line-clamp-2">
                        {bet.marketQuestion}
                      </p>
                      <Badge variant="outline" className={config.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className={bet.position === 'yes' ? 'text-green-400' : 'text-red-400'}>
                        {bet.position.toUpperCase()} • {formatAmount(bet.amount)} MNT
                      </span>
                      <span>{formatDate(bet.timestamp)}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
