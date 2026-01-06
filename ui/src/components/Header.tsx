import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/useWallet';
import { truncateAddress } from '@/lib/utils';
import { Wallet, LogOut, History, Shield, Eye, PlusCircle, Home } from 'lucide-react';
import { useState } from 'react';
import { BetHistoryDialog } from '@/components/BetHistoryDialog';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/create', label: 'Create', icon: PlusCircle },
  { path: '/committee', label: 'Committee', icon: Shield },
  { path: '/oracle', label: 'Oracle', icon: Eye },
];

export function Header() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const location = useLocation();
  const [showBetHistory, setShowBetHistory] = useState(false);
  const [showHistory] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                Anonymous PM
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={location.pathname === path || location.pathname.startsWith(`${path}/`) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Wallet */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  {showHistory ? (<Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBetHistory(true)}
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                  </Button>) : null}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                    <Wallet className="h-4 w-4 text-green-400" />
                    <span className="font-mono text-sm">
                      {truncateAddress(address!)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={disconnect}
                    title="Disconnect"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  className="gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-around border-t border-border/40 py-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path}>
              <Button
                variant={location.pathname === path || location.pathname.startsWith(`${path}/`) ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-col gap-1 h-auto py-2"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </header>

      <BetHistoryDialog open={showBetHistory} onOpenChange={setShowBetHistory} />
    </>
  );
}
