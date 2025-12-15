import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { mockMarkets } from '@/lib/mock-data';
import { toast } from 'sonner';
import { 
  Shield, Key, Lock 
} from 'lucide-react';
import { CommitteeKeyGenerationPage } from '@/pages/CommitteeKeyGenerationPage';
import { CommitteeDecryptionPage } from '@/pages/CommitteeDecryptionPage';

type TabType = 'keygen' | 'decrypt';

type LoadingStates = Record<string, boolean>;

export function CommitteePage() {
  const { isConnected, connect, address } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});

  const activeTab: TabType = location.pathname.includes('/committee/decrypt') ? 'decrypt' : 'keygen';

  const preparingMarkets = mockMarkets.filter(m => m.status === 'preparing');
  const decryptingMarkets = mockMarkets.filter(
    m => m.status === 'expired'
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
          onClick={() => navigate('/committee/keygen')}
          className="gap-2"
        >
          <Key className="h-4 w-4" />
          Key Generation
        </Button>
        <Button
          variant={activeTab === 'decrypt' ? 'secondary' : 'ghost'}
          onClick={() => navigate('/committee/decrypt')}
          className="gap-2"
        >
          <Lock className="h-4 w-4" />
          Decryption
        </Button>
      </div>

      <Routes>
        <Route index element={<Navigate to="keygen" replace />} />
        <Route
          path="keygen"
          element={
            <CommitteeKeyGenerationPage
              preparingMarkets={preparingMarkets}
              address={address ?? undefined}
              loadingStates={loadingStates}
              onJoinCommittee={handleJoinCommittee}
              onContributeKey={handleContributeKey}
            />
          }
        />
        <Route
          path="decrypt"
          element={
            <CommitteeDecryptionPage
              decryptingMarkets={decryptingMarkets}
              loadingStates={loadingStates}
              onDecrypt={handleDecrypt}
            />
          }
        />
      </Routes>
    </div>
  );
}
