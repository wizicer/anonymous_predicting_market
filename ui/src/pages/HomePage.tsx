import { MarketCard } from '@/components/MarketCard';
import { mockMarkets } from '@/lib/mock-data';
import { Shield, Lock, Eye, Zap } from 'lucide-react';
import type { MarketStatus } from '@/types';

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

const statusOrder: MarketStatus[] = ['active', 'preparing', 'decrypting', 'expired', 'resolved'];

export function HomePage() {
  const marketsByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = mockMarkets.filter(m => m.status === status);
    return acc;
  }, {} as Record<MarketStatus, typeof mockMarkets>);

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
          decrypting: 'Decrypting',
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
