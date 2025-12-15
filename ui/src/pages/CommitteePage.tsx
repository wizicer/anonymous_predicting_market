import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { 
  Shield, Key, Lock 
} from 'lucide-react';
import { CommitteeKeyGenerationPage } from '@/pages/CommitteeKeyGenerationPage';
import { CommitteeDecryptionPage } from '@/pages/CommitteeDecryptionPage';

type TabType = 'keygen' | 'decrypt';

export function CommitteePage() {
  const { isConnected, connect } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: TabType = location.pathname.includes('/committee/decrypt') ? 'decrypt' : 'keygen';

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
            <CommitteeKeyGenerationPage />
          }
        />
        <Route
          path="decrypt"
          element={
            <CommitteeDecryptionPage />
          }
        />
      </Routes>
    </div>
  );
}
