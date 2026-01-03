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
import { PlusCircle, Info, Users, Clock, Shield, Loader2 } from 'lucide-react';
import { createMarket } from '@/services/contractService';

export function CreateMarketPage() {
  const navigate = useNavigate();
  const { isConnected, connect } = useWallet();
  
  const [formData, setFormData] = useState({
    question: 'Will Bitcoin reach $150,000 by end of 2025?',
    description: '',
    category: 'crypto',
    beginDate: '2025-12-25',
    beginTime: '',
    expirationDate: '2026-01-15',
    expirationTime: '',
    minCommittee: 3,
    maxCommittee: 3,
    requiredReputation: 100,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question || !formData.expirationDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse expiration date to unix timestamp
      const expirationDateTime = formData.expirationTime 
        ? `${formData.expirationDate}T${formData.expirationTime}`
        : `${formData.expirationDate}T23:59:59`;
      const expiresAt = BigInt(Math.floor(new Date(expirationDateTime).getTime() / 1000));
      
      // Generate a random salt
      const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

      await createMarket(
        formData.question,
        formData.description,
        salt,
        expiresAt,
        formData.minCommittee,
        formData.requiredReputation
      );

      toast.success('Market created successfully!', {
        description: 'Your market is now in "Preparing" status awaiting committee formation.',
      });
      
      navigate('/');
    } catch (error) {
      console.error('Failed to create market:', error);
      toast.error('Failed to create market', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
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
              Duration
            </CardTitle>
            <CardDescription>
              When should betting start and end for this market?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expDate">Begin Date *</Label>
                <Input
                  id="expDate"
                  type="date"
                  value={formData.beginDate}
                  onChange={(e) => updateField('beginDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expTime">Begin Time (Optional)</Label>
                <Input
                  id="expTime"
                  type="time"
                  value={formData.beginTime}
                  onChange={(e) => updateField('beginTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expDate">End Date *</Label>
                <Input
                  id="expDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => updateField('expirationDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expTime">End Time (Optional)</Label>
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
                <Label htmlFor="maxCommittee">Target Committee Size</Label>
                <Input
                  id="maxCommittee"
                  type="number"
                  min={2}
                  max={10}
                  value={formData.maxCommittee}
                  onChange={(e) => updateField('maxCommittee', parseInt(e.target.value))}
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
                  <li><strong>Expired:</strong> Betting closed, awaiting resolution</li>
                  <li><strong>Resolved:</strong> Bets revealed, payouts available</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <PlusCircle className="h-5 w-5 mr-2" />
          )}
          {isSubmitting ? 'Creating...' : 'Create Market'}
        </Button>
      </form>
    </div>
  );
}
