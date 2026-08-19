import { useEffect, useState } from 'react';
import FarmerLayout from '@/components/FarmerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCrops, getPayouts, getSalesReport, requestPayout, bulkUpdateCropAvailability, updateCrop } from '../api';
import { toast } from '@/components/ui/sonner';

type Mode = 'sales' | 'payout' | 'availability';

const FarmerQuickActionPage = ({ mode }: { mode: Mode }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [available, setAvailable] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const load = async () => {
    setLoading(true);
    try {
      if (mode === 'sales') {
        const result = await getSalesReport();
        setRows(Array.isArray(result) ? result : result.report || []);
      } else if (mode === 'payout') {
        const [report, payoutRows] = await Promise.all([getSalesReport(), getPayouts()]);
        const reportRows = Array.isArray(report) ? report : report.report || [];
        const requested = new Set((payoutRows || []).map((payout: any) => payout.order_id));
        setRows(reportRows.filter((row: any) => !requested.has(row.orderId ?? row.id)));
        setPayouts(Array.isArray(payoutRows) ? payoutRows : []);
      } else {
        const crops = await getCrops();
        const cropRows = Array.isArray(crops) ? crops : [];
        setRows(cropRows);
        setQuantities(Object.fromEntries(cropRows.map((crop: any) => [crop.id, Number(crop.quantity || 0)])));
      }
    } catch {
      toast.error('Unable to load this page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [mode]);

  const submitPayout = async () => {
    setLoading(true);
    try {
      for (const id of selected) {
        const row = rows.find((item) => (item.orderId ?? item.id) === id);
        const result = await requestPayout({ order_id: id, amount: Number(row?.total || 0) });
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }
      toast.success('Payout request submitted');
      setSelected([]);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async () => {
    if (!selected.length) {
      toast.error('Select at least one crop');
      return;
    }
    for (const cropId of selected) {
      const result = await updateCrop(cropId, { quantity: Math.max(0, Number(quantities[cropId] || 0)) });
      if (result.error) return toast.error(result.error);
    }
    const result = await bulkUpdateCropAvailability(selected, available);
    if (result.error) return toast.error(result.error);
    toast.success('Availability updated');
    setSelected([]);
    await load();
  };

  const title = mode === 'sales' ? 'Sales Report' : mode === 'payout' ? 'Request Payment' : 'Update Availability';
  const description = mode === 'sales'
    ? 'Review your paid and completed sales.'
    : mode === 'payout'
      ? 'Request payment for eligible completed orders.'
      : 'Update availability for multiple products.';

  return (
    <FarmerLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {loading ? <p>Loading...</p> : null}

        {!loading && mode === 'sales' && (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left"><th className="p-3">Order</th><th className="p-3">Crop</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.orderId ?? row.id} className="border-b"><td className="p-3">#{row.orderId ?? row.id}</td><td className="p-3">{row.cropName || 'Produce'}</td><td className="p-3">GHS {Number(row.total || 0).toFixed(2)}</td><td className="p-3"><Badge>{row.status}</Badge></td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {!loading && mode === 'payout' && (
          <div className="space-y-4">
            <Card><CardHeader><CardTitle>Eligible orders</CardTitle></CardHeader><CardContent className="space-y-3">
              {rows.map((row) => {
                const id = row.orderId ?? row.id;
                return <label key={id} className="flex items-center justify-between rounded border p-3"><span><input type="checkbox" className="mr-3" checked={selected.includes(id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, id] : items.filter((item) => item !== id))} />Order #{id} · {row.cropName || 'Produce'}</span><span>GHS {Number(row.total || 0).toFixed(2)}</span></label>;
              })}
              {!rows.length && <p className="text-sm text-muted-foreground">No eligible orders available.</p>}
              <Button onClick={submitPayout} disabled={!selected.length}>Request Payment</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Payout history</CardTitle></CardHeader><CardContent>{payouts.map((payout) => <div key={payout.id} className="flex justify-between border-b py-2 text-sm"><span>Order #{payout.order_id}</span><span>{payout.status} · GHS {Number(payout.amount).toFixed(2)}</span></div>)}</CardContent></Card>
          </div>
        )}

        {!loading && mode === 'availability' && (
          <Card><CardHeader><CardTitle>Product availability</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex gap-2"><Button variant={available ? 'default' : 'outline'} onClick={() => setAvailable(true)}>Available</Button><Button variant={!available ? 'default' : 'outline'} onClick={() => setAvailable(false)}>Unavailable</Button></div>
            {rows.map((crop) => <label key={crop.id} className="flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"><span><input type="checkbox" className="mr-3" checked={selected.includes(crop.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, crop.id] : items.filter((item) => item !== crop.id))} />{crop.name}</span><span className="flex items-center gap-2"><input type="number" min="0" value={quantities[crop.id] ?? 0} onChange={(event) => setQuantities((items) => ({ ...items, [crop.id]: Number(event.target.value) }))} className="w-24 rounded-md border bg-background px-2 py-1" />{crop.unit}</span></label>)}
            <Button onClick={updateAvailability} disabled={!selected.length}>Save Availability</Button>
          </CardContent></Card>
        )}
      </div>
    </FarmerLayout>
  );
};

export default FarmerQuickActionPage;
