import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Search, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminGiftCards = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data } = await supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });
    setCards(data || []);
    setLoading(false);
  };

  const createCard = async () => {
    const amount = parseInt(newAmount);
    if (!amount || amount < 100) {
      toast.error('সর্বনিম্ন ৳১০০');
      return;
    }

    setCreating(true);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "GC-";
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += "-";
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error } = await supabase.from('gift_cards').insert({
      code,
      amount,
      balance: amount,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error('তৈরি করতে সমস্যা হয়েছে');
    } else {
      toast.success(`গিফট কার্ড তৈরি হয়েছে: ${code}`);
      setNewAmount('');
      fetchCards();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('gift_cards').update({ is_active: !isActive }).eq('id', id);
    fetchCards();
    toast.success(isActive ? 'নিষ্ক্রিয় করা হয়েছে' : 'সক্রিয় করা হয়েছে');
  };

  const filteredCards = cards.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6" />
              গিফট কার্ড
            </h1>
            <p className="text-muted-foreground">গিফট কার্ড ম্যানেজমেন্ট</p>
          </div>
        </div>

        {/* Quick Create */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  placeholder="পরিমাণ (৳)"
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <Button onClick={createCard} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                নতুন কার্ড তৈরি
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="কোড বা নাম দিয়ে খুঁজুন..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Cards Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কোড</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead>ব্যালেন্স</TableHead>
                    <TableHead>প্রাপক</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>তৈরির তারিখ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map(card => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono text-sm">{card.code}</TableCell>
                      <TableCell>৳{Number(card.amount).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">৳{Number(card.balance).toLocaleString()}</TableCell>
                      <TableCell>{card.recipient_name || '-'}</TableCell>
                      <TableCell>
                        {card.is_active ? (
                          <Badge variant="secondary">সক্রিয়</Badge>
                        ) : (
                          <Badge variant="destructive">নিষ্ক্রিয়</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(card.created_at).toLocaleDateString('bn-BD')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(card.id, card.is_active)}
                        >
                          {card.is_active ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminGiftCards;
