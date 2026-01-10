import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { EncryptedIndicator } from '@/components/EncryptedIndicator';
import { formatDate, formatAmount, formatRelativeTime } from '@/lib/utils';
import type { Market } from '@/types';
import { Lock, Users, Clock, TrendingUp } from 'lucide-react';
import { getEffectiveStatus } from '@/lib/marketStatus';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const effectiveStatus = getEffectiveStatus(market);
  const isResolved = effectiveStatus === 'resolved';
  const isPreparing = effectiveStatus === 'preparing';
  
  return (
    <Link to={`/market/${market.id}`}>
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <StatusBadge status={effectiveStatus} />
            <span className="text-xs text-muted-foreground font-mono">
              {market.category.toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-tight mt-2 line-clamp-2">
            {market.question}
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Probability / Encrypted indicator */}
          {isResolved ? (
            <div className="space-y-2">
              {(() => {
                const sum0 = market.sum0 || 0n;
                const sum1 = market.sum1 || 0n;
                const total = sum0 + sum1;
                const yesPercentage = total > 0n ? Math.round(Number((sum1 * 10000n) / total) / 100) : 0;
                const noPercentage = total > 0n ? Math.round(Number((sum0 * 10000n) / total) / 100) : 0;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400 font-medium">YES {yesPercentage}%</span>
                      <span className="text-red-400 font-medium">NO {noPercentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                      <div 
                        className="bg-green-500 transition-all" 
                        style={{ width: `${yesPercentage}%` }} 
                      />
                      <div 
                        className="bg-red-500 transition-all" 
                        style={{ width: `${noPercentage}%` }} 
                      />
                    </div>
                  </>
                );
              })()}
              <div className="flex items-center justify-center gap-2 py-1">
                <span className={`text-sm font-bold ${market.outcome === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                  Outcome: {market.outcome?.toUpperCase()}
                </span>
              </div>
            </div>
          ) : isPreparing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <Users className="h-4 w-4" />
                <span className="text-sm">Committee Formation</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="bg-amber-500 transition-all h-full" 
                  style={{ width: `${(market.committee.length / Number(market.requiredCommittee)) * 100}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {market.committee.length} / {Number(market.requiredCommittee)} members
              </p>
            </div>
          ) : (
            <EncryptedIndicator />
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>{formatAmount(market.totalVolume)} ETH</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>{market.totalBets} bets</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
              <Clock className="h-4 w-4" />
              <span>
                {effectiveStatus === 'resolved' 
                  ? `Resolved ${formatDate(market.resolvedAt!)}`
                  : formatRelativeTime(market.expiresAt)
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
