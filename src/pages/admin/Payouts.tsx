import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPayouts, updatePayout } from '../../api';
import { toast } from '@/components/ui/sonner';

const Payouts = () => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getPayouts();
    if (Array.isArray(data)) setPayouts(data);
    else toast.error(data.error || 'Failed to load payouts');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: number, status: string) => {
    const result = await updatePayout(id, { status });
    if (result.error) return toast.error(result.error);
    toast.success(`Payout marked ${status}`);
    load();
  };

  return <AdminLayout><div className="space-y-6"><div><h1 className="text-2xl font-bold">Farmer Payouts</h1><p className="text-muted-foreground">Review requests and record when payments are sent.</p></div><div className="overflow-x-auto rounded-lg border bg-card/40"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Farmer</th><th className="p-3">Order</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{loading ? <tr><td className="p-4" colSpan={5}>Loading payouts...</td></tr> : payouts.map((payout) => <tr key={payout.id} className="border-b"><td className="p-3">{payout.farmer?.name || payout.farmer_id}</td><td className="p-3">#{payout.order_id}</td><td className="p-3">GH₵ {Number(payout.amount).toFixed(2)}</td><td className="p-3"><Badge>{payout.status}</Badge></td><td className="p-3"><div className="flex gap-2">{payout.status === 'pending' && <Button size="sm" variant="outline" onClick={() => changeStatus(payout.id, 'processing')}>Processing</Button>}{['pending', 'processing'].includes(payout.status) && <><Button size="sm" onClick={() => changeStatus(payout.id, 'paid')}>Mark paid</Button><Button size="sm" variant="destructive" onClick={() => changeStatus(payout.id, 'rejected')}>Reject</Button></>}</div></td></tr>)}</tbody></table></div></div></AdminLayout>;
};

export default Payouts;
