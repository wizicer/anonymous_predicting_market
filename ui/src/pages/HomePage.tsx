import { MarketCard } from '@/components/MarketCard';
import { Shield, Lock, Eye, Zap, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Market, MarketStatus } from '@/types';
import { useState, useEffect } from 'react';
import { getAllMarkets, isDeployed } from '@/services/contractService';
import { getEffectiveStatus } from '@/lib/marketStatus';

const features = [
  {
    icon: Lock,
    title: 'Encrypted Bets',
    description: 'Your position remains hidden until market resolution',
  },
  {
    icon: Shield,
    title: 'Threshold Encryption',
    description: 'Committee-based key management ensures security',
  },
  {
    icon: Eye,
    title: 'ZK Verification',
    description: 'Cryptographic proofs validate all decryptions',
  },
  {
    icon: Zap,
    title: 'No Front-Running',
    description: 'Encrypted bets prevent market manipulation',
  },
];

const statusOrder: MarketStatus[] = ['active', 'preparing', 'expired', 'resolved'];

export function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    if (!isDeployed()) {
      setError('Contract not deployed. Run `npm run chain` and `npm run deploy` first.');
      setIsLoading(false);
      return;
    }
    
    try {
      const allMarkets = await getAllMarkets();
      setMarkets(allMarkets);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setError('Failed to load markets. Make sure MetaMask is connected to localhost:8545');
    } finally {
      setIsLoading(false);
    }
  };

  const marketsByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = markets.filter(m => getEffectiveStatus(m) === status);
    return acc;
  }, {} as Record<MarketStatus, Market[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
          <Shield className="h-4 w-4" />
          <span>Powered by Threshold Encryption & Zero-Knowledge Proofs</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          Anonymous Prediction Market
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Place bets without revealing your position. Your predictions are encrypted until market resolution, 
          ensuring fair and manipulation-free trading.
        </p>
        
        {/* CTA Button */}
        <div className="pt-8">
          <Button
            onClick={() => window.open('https://github.com/wizicer/anonymous_predicting_market/blob/main/docs/protocol.md', '_blank')}
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white border-0 shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 transform hover:scale-105 px-12 py-4 text-lg font-semibold"
          >
            <span className="relative z-10 flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              Read the Protocol
              <BookOpen className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Deep dive into the cryptographic mechanisms powering anonymous betting
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-4 rounded-lg bg-card/50 border border-border/50 text-left">
              <Icon className="h-8 w-8 text-purple-400 mb-2" />
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Markets by Status */}
      {statusOrder.map(status => {
        const markets = marketsByStatus[status];
        if (markets.length === 0) return null;
        
        const titles: Record<MarketStatus, string> = {
          preparing: 'Preparing Markets',
          active: 'Active Markets',
          expired: 'Awaiting Resolution',
          resolved: 'Resolved Markets',
        };
        
        return (
          <section key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{titles[status]}</h2>
              <span className="text-sm text-muted-foreground">
                {markets.length} market{markets.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
