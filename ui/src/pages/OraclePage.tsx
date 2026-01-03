import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { useWallet } from '@/contexts/useWallet';
import type { Market } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Eye, AlertTriangle, CheckCircle, XCircle, 
  Loader2
} from 'lucide-react';
import { getAllMarkets, submitOutcome, Outcome } from '@/services/contractService';
import { getEffectiveStatus } from '@/lib/marketStatus';

export function OraclePage() {
  const { isConnected, connect } = useWallet();
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'yes' | 'no' | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const allMarkets = await getAllMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error('Failed to load markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setIsLoading(false);
    }
  };

  // Markets that are active and past expiration time need oracle submission
  const awaitingMarkets = markets.filter(
    m => m.status === 'active' && new Date(m.expiresAt) <= new Date()
  );

  const handleSubmit = async () => {
    if (!selectedMarket || !outcome) {
      toast.error('Please select a market and outcome');
      return;
    }

    setIsSubmitting(true);
    try {
      const outcomeValue = outcome === 'yes' ? Outcome.Yes : Outcome.No;
      await submitOutcome(BigInt(selectedMarket), outcomeValue);
      
      toast.success('Ground truth submitted!', {
        description: 'Resolution will take effect after 24-hour delay period.',
      });
      
      setSelectedMarket(null);
      setOutcome(null);
      setProofUrl('');
      await loadMarkets();
    } catch (error) {
      console.error('Failed to submit outcome:', error);
      toast.error('Failed to submit outcome', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Wallet to Submit Resolutions</h2>
            <p className="text-muted-foreground">
              You need to connect your wallet to submit oracle resolutions.
            </p>
            <Button onClick={connect}>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Oracle Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Submit ground truth for expired markets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Submit Resolution
              </CardTitle>
              <CardDescription>
                Select a market and submit the ground truth outcome
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Market Selection */}
              <div className="space-y-2">
                <Label>Select Market</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {awaitingMarkets.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No markets awaiting resolution
                    </p>
                  ) : (
                    awaitingMarkets.map(market => (
                      <button
                        key={market.id}
                        onClick={() => setSelectedMarket(market.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedMarket === market.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-2">
                            {market.question}
                          </p>
                          <StatusBadge status={getEffectiveStatus(market)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expired: {formatDate(market.expiresAt)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Outcome Selection */}
              {selectedMarket && (
                <>
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={outcome === 'yes' ? 'default' : 'outline'}
                        className={outcome === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => setOutcome('yes')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={outcome === 'no' ? 'default' : 'outline'}
                        className={outcome === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={() => setOutcome('no')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        NO
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proofUrl">Proof URL (Optional)</Label>
                    <Input
                      id="proofUrl"
                      type="url"
                      placeholder="https://..."
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Link to documentation or evidence supporting the resolution
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!outcome || isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Resolution
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Delay Notice */}
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-400 mb-1">24-Hour Delay Period</p>
                  <p className="text-muted-foreground">
                    All oracle submissions are subject to a 24-hour delay before taking effect. 
                    This allows time for disputes and verification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resolved Markets */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Resolved Markets
              </CardTitle>
              <CardDescription>
                Markets that have been resolved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {markets.filter(m => m.status === 'resolved' || m.status === 'expired').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No resolved markets yet
                </p>
              ) : (
                <div className="space-y-3">
                  {markets.filter(m => m.status === 'resolved' || m.status === 'expired').map(market => (
                    <div
                      key={market.id}
                      className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link 
                          to={`/market/${market.id}`}
                          className="text-sm font-medium hover:underline line-clamp-2"
                        >
                          {market.question}
                        </Link>
                        <StatusBadge status={getEffectiveStatus(market)} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expired: {formatDate(market.expiresAt)}
                      </p>
                      {market.outcome && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Outcome: {market.outcome.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
