import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { mockMarkets } from '@/lib/mock-data';
import type { Market } from '@/types';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, Download, Loader2, Lock, Shield, Upload } from 'lucide-react';

type LoadingStates = Record<string, boolean>;

type DecryptStep = 'download' | 'proof' | 'upload';

export function CommitteeDecryptionPage() {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});

  const decryptingMarkets: Market[] = mockMarkets.filter(m => m.status === 'expired');

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const handleDecrypt = async (marketId: string, step: DecryptStep) => {
    const key = `${step}-${marketId}`;
    setLoading(key, true);
    await new Promise(r => setTimeout(r, 1500));

    const messages = {
      download: 'Encrypted bets downloaded',
      proof: 'ZK proof generated successfully',
      upload: 'Decryption results uploaded',
    };

    toast.success(messages[step]);
    setLoading(key, false);
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400 mb-1">Decryption Workflow</p>
              <p className="text-muted-foreground">
                After market expiration, committee members must submit their ephemeral
                private keys to enable bet decryption. ZK proofs verify correct decryption.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markets List */}
      {decryptingMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No markets awaiting decryption
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decryptingMarkets.map(market => {
            const decryptedCount = market.committee.filter(m => m.decryptionSubmitted).length;

            return (
              <Card key={market.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Link to={`/market/${market.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{market.question}</CardTitle>
                      </Link>
                      <CardDescription>
                        Expired: {formatDate(market.expiresAt)} •
                        {market.totalBets} bets to decrypt
                      </CardDescription>
                    </div>
                    <StatusBadge status={market.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Decryption Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Decryption Progress</span>
                      <span>{decryptedCount} / {market.committee.length} keys submitted</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${(decryptedCount / market.committee.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Three-step workflow */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'download')}
                      disabled={loadingStates[`download-${market.id}`]}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`download-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">1. Download</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'proof')}
                      disabled={loadingStates[`proof-${market.id}`]}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`proof-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">2. Gen Proof</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'upload')}
                      disabled={loadingStates[`upload-${market.id}`]}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`upload-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">3. Upload</span>
                    </Button>
                  </div>

                  {/* Committee Status */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {market.committee.map((member, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={`font-mono text-xs ${
                          member.decryptionSubmitted
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : ''
                        }`}
                      >
                        {truncateAddress(member.address)}
                        {member.decryptionSubmitted && (
                          <CheckCircle className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
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
