import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { WalletProvider } from '@/contexts/WalletContext';
import { Header } from '@/components/Header';
import { initPoseidon } from '@/services/encryption';
import { 
  HomePage, 
  MarketDetailPage, 
  CreateMarketPage, 
  CommitteePage, 
  OraclePage,
  DeployPage,
  AlgoTestPage 
} from '@/pages';

function App() {
  // Initialize Poseidon on app startup
  useEffect(() => {
    initPoseidon().catch((error) => {
      console.error('Failed to initialize Poseidon:', error);
    });
  }, []);

  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/market/:id" element={<MarketDetailPage />} />
              <Route path="/create" element={<CreateMarketPage />} />
              <Route path="/committee/*" element={<CommitteePage />} />
              <Route path="/oracle" element={<OraclePage />} />
              <Route path="/deploy" element={<DeployPage />} />
              <Route path="/algo" element={<AlgoTestPage />} />
            </Routes>
          </main>
        </div>
        <Toaster 
          theme="dark" 
          position="bottom-right"
          toastOptions={{
            className: 'bg-card border-border',
          }}
        />
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App
