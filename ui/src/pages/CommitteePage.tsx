import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { useWallet } from '@/contexts/WalletContext';
import { mockMarkets } from '@/lib/mock-data';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Shield, Key, Download, Upload, CheckCircle, 
  Users, Lock, FileKey, Loader2 
} from 'lucide-react';

type TabType = 'keygen' | 'decrypt';

export function CommitteePage() {
  const { isConnected, connect, address } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('keygen');
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const preparingMarkets = mockMarkets.filter(m => m.status === 'preparing');
  const decryptingMarkets = mockMarkets.filter(
    m => m.status === 'expired' || m.status === 'decrypting'
  );

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const handleJoinCommittee = async (marketId: string) => {
    setLoading(`join-${marketId}`, true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Joined committee successfully!');
    setLoading(`join-${marketId}`, false);
  };

  const handleContributeKey = async (marketId: string) => {
    setLoading(`key-${marketId}`, true);
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Key share contributed!', {
      description: 'Your ephemeral key share has been submitted.',
    });
    setLoading(`key-${marketId}`, false);
  };

  const handleDecrypt = async (marketId: string, step: 'download' | 'proof' | 'upload') => {
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

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Wallet to Access Committee</h2>
            <p className="text-muted-foreground">
              You need to connect your wallet to participate as a committee member.
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
        <h1 className="text-3xl font-bold">Committee Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage threshold encryption keys and decryption duties
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'keygen' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('keygen')}
          className="gap-2"
        >
          <Key className="h-4 w-4" />
          Key Generation
        </Button>
        <Button
          variant={activeTab === 'decrypt' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('decrypt')}
          className="gap-2"
        >
          <Lock className="h-4 w-4" />
          Decryption
        </Button>
      </div>

      {/* Key Generation Tab */}
      {activeTab === 'keygen' && (
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
                            onClick={() => handleJoinCommittee(market.id)}
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
                            onClick={() => handleContributeKey(market.id)}
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
      )}

      {/* Decryption Tab */}
      {activeTab === 'decrypt' && (
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
      )}
    </div>
  );
}
