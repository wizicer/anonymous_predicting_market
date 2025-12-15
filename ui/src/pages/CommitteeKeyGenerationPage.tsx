import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import type { Market } from '@/types';
import { formatDate, truncateAddress } from '@/lib/utils';
import { CheckCircle, FileKey, Key, Loader2, Users } from 'lucide-react';

type LoadingStates = Record<string, boolean>;

export function CommitteeKeyGenerationPage({
  preparingMarkets,
  address,
  loadingStates,
  onJoinCommittee,
  onContributeKey,
}: {
  preparingMarkets: Market[];
  address?: string;
  loadingStates: LoadingStates;
  onJoinCommittee: (marketId: string) => void;
  onContributeKey: (marketId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <FileKey className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-400 mb-1">Threshold Encryption</p>
              <p className="text-muted-foreground">
                Committee members collaboratively generate a public key for encrypting bets.
                A threshold of members is required to decrypt after market expiration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markets List */}
      {preparingMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No markets currently in preparation phase
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {preparingMarkets.map(market => {
            const progress = (market.committee.length / market.requiredCommittee) * 100;
            const isJoined = market.committee.some(
              m => m.address.toLowerCase() === address?.toLowerCase()
            );

            return (
              <Card key={market.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Link to={`/market/${market.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{market.question}</CardTitle>
                      </Link>
                      <CardDescription>
                        Expires: {formatDate(market.expiresAt)} •
                        Min Reputation: {market.requiredReputation}
                      </CardDescription>
                    </div>
                    <StatusBadge status={market.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Committee Formation
                      </span>
                      <span>{market.committee.length} / {market.requiredCommittee}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex flex-wrap gap-2">
                    {market.committee.map((member, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        {truncateAddress(member.address)}
                        {member.keyShareSubmitted && (
                          <CheckCircle className="h-3 w-3 ml-1 text-green-400" />
                        )}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!isJoined ? (
                      <Button
                        onClick={() => onJoinCommittee(market.id)}
                        disabled={loadingStates[`join-${market.id}`]}
                      >
                        {loadingStates[`join-${market.id}`] && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Join as Committee
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => onContributeKey(market.id)}
                        disabled={loadingStates[`key-${market.id}`]}
                      >
                        {loadingStates[`key-${market.id}`] ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        Contribute Key Share
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
