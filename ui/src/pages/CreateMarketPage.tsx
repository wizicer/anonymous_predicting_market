import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { MARKET_CATEGORIES } from '@/types';
import { toast } from 'sonner';
import { PlusCircle, Info, Users, Clock, Shield } from 'lucide-react';

export function CreateMarketPage() {
  const navigate = useNavigate();
  const { isConnected, connect } = useWallet();
  
  const [formData, setFormData] = useState({
    question: 'Will Bitcoin reach $150,000 by end of 2025?',
    description: '',
    category: 'crypto',
    expirationDate: '',
    expirationTime: '',
    minCommittee: 3,
    requiredReputation: 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question || !formData.expirationDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Market created successfully!', {
      description: 'Your market is now in "Preparing" status awaiting committee formation.',
    });
    
    navigate('/');
  };

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Wallet to Create Market</h2>
            <p className="text-muted-foreground">
              You need to connect your wallet to create a new prediction market.
            </p>
            <Button onClick={connect}>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Market</h1>
        <p className="text-muted-foreground mt-2">
          Create a new anonymous prediction market
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <Card>
          <CardHeader>
            <CardTitle>Market Question</CardTitle>
            <CardDescription>
              The question that will be resolved as YES or NO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                placeholder="Will X happen by Y date?"
                value={formData.question}
                onChange={(e) => updateField('question', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide additional context and resolution criteria..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                {MARKET_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Expiration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Expiration
            </CardTitle>
            <CardDescription>
              When should betting close for this market?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expDate">Date *</Label>
                <Input
                  id="expDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => updateField('expirationDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expTime">Time (Optional)</Label>
                <Input
                  id="expTime"
                  type="time"
                  value={formData.expirationTime}
                  onChange={(e) => updateField('expirationTime', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Committee Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Committee Requirements
            </CardTitle>
            <CardDescription>
              Configure the threshold encryption committee
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minCommittee">Minimum Committee Size</Label>
                <Input
                  id="minCommittee"
                  type="number"
                  min={2}
                  max={10}
                  value={formData.minCommittee}
                  onChange={(e) => updateField('minCommittee', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reputation">Required Reputation</Label>
                <Input
                  id="reputation"
                  type="number"
                  min={0}
                  step={50}
                  value={formData.requiredReputation}
                  onChange={(e) => updateField('requiredReputation', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-400">Market Lifecycle</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li><strong>Preparing:</strong> Market created, awaiting committee formation</li>
                  <li><strong>Active:</strong> Committee threshold met, accepting encrypted bets</li>
                  <li><strong>Expired:</strong> Betting closed, awaiting ground truth</li>
                  <li><strong>Decrypting:</strong> Committee submitting decryption keys</li>
                  <li><strong>Resolved:</strong> Bets revealed, payouts available</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full">
          <PlusCircle className="h-5 w-5 mr-2" />
          Create Market
        </Button>
      </form>
    </div>
  );
}
