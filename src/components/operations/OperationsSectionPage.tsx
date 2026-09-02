import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CheckCircle2, ClipboardCheck, DollarSign, Loader2, Truck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createDelivery, createUser, getAdminOrders, getMarketDemandAnalysis, getPayouts, listQualityChecks, listUsers, updateOrder, updatePayout } from "@/api";
import OperationsLayout from "@/components/operations/OperationsLayout";
import { QualityCheckForm } from "@/components/operations/QualityCheckForm";
import { useToast } from "@/hooks/use-toast";

export type OperationsSection = 'dashboard' | 'queue' | 'quality' | 'history' | 'dispatch' | 'delivered' | 'market-demand' | 'payouts' | 'team';

interface OperationsSectionPageProps {
  section?: OperationsSection;
  isAdminMode?: boolean;
}

type OrderRecord = {
  id: number;
  crop_id: number;
  status: string;
  quantity: number;
  delivery_service?: string;
  delivery_status?: string;
  tracking_number?: string;
  tracking_url?: string;
  delivery_info?: any;
};

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
};

type PayoutRecord = {
  id: number;
  order_id: number;
  farmer_id: number;
  amount: number;
  status: string;
  farmer?: UserRecord;
};

const todayLabel = () => new Date().toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const buildOrderRecord = (order: any): OrderRecord => ({
  id: Number(order.id),
  crop_id: Number(order.crop_id ?? order.crop?.id ?? 0),
  quantity: Number(order.quantity ?? 0),
  status: String(order.status || 'pending'),
  delivery_service: order.delivery_service,
  delivery_status: order.delivery_status,
  tracking_number: order.tracking_number,
  tracking_url: order.tracking_url,
  delivery_info: order.delivery_info,
});

const OperationsSectionPage = ({ section = 'dashboard', isAdminMode = false }: OperationsSectionPageProps) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [qualityHistory, setQualityHistory] = useState<any[]>([]);
  const [expandedQualityIds, setExpandedQualityIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [dispatchDrafts, setDispatchDrafts] = useState<Record<number, { provider?: string; tracking_number?: string; tracking_url?: string }>>({});
  const [form, setForm] = useState({ name: '', email: '', password: '', location: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [demandCropType, setDemandCropType] = useState('tomato');
  const [demandData, setDemandData] = useState<any>(null);
  const [demandLoading, setDemandLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const setActionBusy = (action: string, busy: boolean) => {
    setActionLoading((current) => ({ ...current, [action]: busy }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orderData, usersData, payoutData, qualityData] = await Promise.all([
          getAdminOrders(),
          listUsers(),
          getPayouts(),
          listQualityChecks(),
        ]);

        console.log('[Operations] Raw order data:', orderData);

        setOrders(Array.isArray(orderData) ? orderData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setPayouts(Array.isArray(payoutData) ? payoutData : []);
        setQualityHistory(Array.isArray(qualityData) ? qualityData : []);
      } catch (error) {
        console.error('Failed to load operations dashboard', error);
        const messageText = error instanceof Error ? error.message : 'Unknown error';
        setLoadError(`Failed to load operations data: ${messageText}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (section !== 'market-demand') return;
    setDemandLoading(true);
    getMarketDemandAnalysis(demandCropType)
      .then((result) => setDemandData(result?.error ? null : result))
      .catch(() => setDemandData(null))
      .finally(() => setDemandLoading(false));
  }, [demandCropType, section]);

  useEffect(() => {
    const refreshLoop = window.setInterval(() => {
      void refreshOrders();
    }, 15000);

    const handleFocus = () => {
      void refreshOrders();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(refreshLoop);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const normalizeStatus = (status?: string) => {
    const raw = String(status || '').trim().toLowerCase();
    const legacyMap: Record<string, string> = {
      pending: 'pending_payment',
      preparing: 'farmer_preparing',
      ready: 'ready_for_dispatch',
      shipped: 'dispatched',
      completed: 'paid',
      paid: 'paid',
      confirmed: 'confirmed',
    };

    return legacyMap[raw] || raw;
  };

  const opsUsers = useMemo(() => users.filter((user) => user.role === 'operations'), [users]);
  const pendingDrops = useMemo(
    () => {
      const filtered = orders.filter((order) => {
        const status = normalizeStatus(order.status);
        return ['sent_to_operations_centre', 'received_at_centre'].includes(status);
      });
      console.log('[Operations] Pending drops filter:', {
        totalOrders: orders.length,
        statusValues: orders.map(o => ({ id: o.id, status: o.status, normalized: normalizeStatus(o.status) })),
        filtered: filtered.map(f => ({ id: f.id, status: f.status, normalized: normalizeStatus(f.status) }))
      });
      return filtered;
    },
    [orders],
  );
  const qualityChecks = useMemo(
    () => orders.filter((order) => {
      const status = normalizeStatus(order.status);
      return ['quality_check', 'ready_for_dispatch'].includes(status);
    }),
    [orders],
  );
  const dispatch = useMemo(
    () => orders.filter((order) => {
      const status = normalizeStatus(order.status);
      return ['ready_for_dispatch', 'packed', 'dispatched', 'payout_ready'].includes(status);
    }),
    [orders],
  );
  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === 'pending'),
    [payouts],
  );

  const refreshOrders = async () => {
    try {
      const [refreshed, payoutRefresh, qualityRefresh] = await Promise.all([
        getAdminOrders(),
        getPayouts(),
        listQualityChecks(),
      ]);

      console.log('[Operations] Refresh response:', { refreshed, payoutRefresh, qualityRefresh });

      if (refreshed && !('error' in refreshed)) {
        const orderArray = Array.isArray(refreshed) ? refreshed : [];
        console.log('[Operations] Updated orders:', orderArray);
        console.log('[Operations] Order statuses after refresh:', orderArray.map(o => ({ id: o.id, status: o.status, type: typeof o.status })));
        orderArray.forEach(o => console.log(`Order ${o.id}: status="${o.status}"`));
        setOrders(orderArray);
        setLoadError('');
      } else {
        console.error('[Operations] Error refreshing orders:', refreshed);
        const nextError = refreshed?.error || 'Unknown error while refreshing orders';
        setLoadError(`Operations data unavailable: ${nextError}`);
      }

      if (payoutRefresh && !('error' in payoutRefresh)) {
        setPayouts(Array.isArray(payoutRefresh) ? payoutRefresh : []);
      }

      if (qualityRefresh && !('error' in qualityRefresh)) {
        setQualityHistory(Array.isArray(qualityRefresh) ? qualityRefresh : []);
      }
    } catch (err) {
      console.error('[Operations] Refresh failed:', err);
    }
  };

  const handleStatusUpdate = async (orderId: number, nextStatus: string) => {
    const action = `status-${orderId}-${nextStatus}`;
    setActionBusy(action, true);
    console.log('[Operations] Updating order status:', { orderId, nextStatus });
    try {
      const result = await updateOrder(orderId, { status: nextStatus });
      console.log('[Operations] Update result:', result);

      if (!result?.error) {
        await refreshOrders();
        const destination = nextStatus === 'packed' ? ' Continue in Dispatch to assign delivery.' : '';
        const description = `Order #${orderId} moved to ${formatStatusLabel(nextStatus)}.${destination}`;
        setMessage(description);
        toast({ title: 'Order updated', description });
        if (nextStatus === 'packed') {
          navigate('/operations/dispatch');
        }
        if (nextStatus === 'delivered') {
          navigate('/operations/delivered');
        }
      } else {
        setMessage(result.error || 'Failed to update order status.');
        toast({ title: 'Order update failed', description: result.error || 'Failed to update order status.', variant: 'destructive' });
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Failed to update order status.';
      setMessage(description);
      toast({ title: 'Order update failed', description, variant: 'destructive' });
    } finally {
      setActionBusy(action, false);
    }
  };

  const formatStatusLabel = (status: string) => normalizeStatus(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const handlePayoutApproval = async (payoutId: number) => {
    const action = `payout-${payoutId}`;
    setActionBusy(action, true);
    try {
      const result = await updatePayout(payoutId, { status: 'paid' });
      if (!result?.error) {
        await refreshOrders();
        const description = `Payout #${payoutId} approved and marked as paid.`;
        setMessage(description);
        toast({ title: 'Payout approved', description });
      } else {
        setMessage(result.error || 'Failed to approve payout.');
        toast({ title: 'Payout approval failed', description: result.error || 'Failed to approve payout.', variant: 'destructive' });
      }
    } finally {
      setActionBusy(action, false);
    }
  };

  const handleDispatchAssignment = async (orderId: number) => {
    const action = `dispatch-${orderId}`;
    setActionBusy(action, true);
    const draft = dispatchDrafts[orderId] ?? {};
    try {
      const provider = draft.provider || 'sendstack';
      const order = orders.find((candidate) => candidate.id === orderId);
      const deliveryInfo = typeof order?.delivery_info === 'string'
        ? JSON.parse(order.delivery_info)
        : order?.delivery_info || {};
      const deliveryResult = await createDelivery(orderId, {
        ...deliveryInfo,
        deliveryService: provider,
        address: deliveryInfo.address || deliveryInfo.pickupLocation,
      });

      if (deliveryResult?.error || deliveryResult?.success === false) {
        throw new Error(deliveryResult?.error || 'Sendstack could not create the delivery.');
      }

      const result = await updateOrder(orderId, {
        status: 'dispatched',
        delivery_status: deliveryResult.delivery_status || 'Order Placed',
        delivery_service: provider,
        tracking_number: deliveryResult.tracking_number,
        tracking_url: deliveryResult.tracking_url,
      });

      if (!result?.error) {
        await refreshOrders();
        const description = `Order #${orderId} is now in transit with ${provider.toUpperCase()} tracking.`;
        setMessage(description);
        toast({ title: 'Dispatch assigned', description });
      } else {
        setMessage(result.error || 'Failed to assign dispatch.');
        toast({ title: 'Dispatch failed', description: result.error || 'Failed to assign dispatch.', variant: 'destructive' });
      }
    } finally {
      setActionBusy(action, false);
    }
  };

  const openQualityCheck = (order: OrderRecord) => {
    setSelectedOrder(order);
    setQualityDialogOpen(true);
    toast({ title: 'Quality check opened', description: `Order #${order.id} is ready for inspection.` });
  };

  const handleQualityComplete = async () => {
    await refreshOrders();
    setQualityDialogOpen(false);
    setSelectedOrder(null);
    toast({ title: 'Quality check saved', description: 'The result was recorded and the order board was refreshed.' });
  };

  const recentQualityChecks = useMemo(() => {
    return [...qualityHistory]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [qualityHistory]);

  const toggleQualityDetails = (id: number) => {
    setExpandedQualityIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const stats = [
    { label: 'Operations staff', value: String(opsUsers.length), icon: Users },
    { label: 'Pending stock drop', value: String(pendingDrops.length), icon: Box },
    { label: 'Quality check', value: String(qualityChecks.length), icon: ClipboardCheck },
    { label: 'In dispatch', value: String(dispatch.length), icon: Truck },
    { label: 'Pending payouts', value: String(pendingPayouts.length), icon: DollarSign },
  ];

  const handleCreateOperationsUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const result = await createUser({
        ...form,
        role: 'operations',
      });

      setSaving(false);

      if (result?.error) {
        setMessage(result.error);
        toast({ title: 'Staff creation failed', description: result.error, variant: 'destructive' });
        return;
      }

      setForm({ name: '', email: '', password: '', location: '', phone: '' });
      if (result?.sms_sent) {
        setMessage(`Operations staff created! Login credentials sent via SMS to ${form.phone}`);
      } else {
        setMessage(`Operations staff created successfully. SMS delivery failed: ${result?.sms_error || 'check Arkesel configuration and phone number.'}`);
      }
      toast({
        title: 'Operations staff created',
        description: result?.sms_sent ? 'Login credentials were sent by SMS.' : 'The account was created, but SMS delivery failed.',
        variant: result?.sms_sent ? 'default' : 'destructive',
      });

      const refreshed = await listUsers();
      if (refreshed && !('error' in refreshed)) {
        setUsers(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (err) {
      setSaving(false);
      const description = `Error: ${String(err)}`;
      setMessage(description);
      toast({ title: 'Staff creation failed', description, variant: 'destructive' });
    }
  };

  const renderDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {isAdminMode && (
          <Card>
            <CardHeader>
              <CardTitle>Create operations staff</CardTitle>
              <CardDescription>Add internal staff for grading, intake, packing, and dispatch.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOperationsUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Full name</label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Phone number</label>
                  <Input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+233..." required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Temporary password</label>
                  <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Will be sent via SMS" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Location/Centre</label>
                  <Input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Collection point location" />
                </div>
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs text-blue-900">
                    ℹ️ Credentials will be sent via SMS. Staff must log in and upload Ghana card + face photo to complete verification.
                  </p>
                </div>
                {message && <p className="text-sm text-muted-foreground">{message}</p>}
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Creating...' : 'Create operations staff'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Collection point queue</CardTitle>
            <CardDescription>Orders waiting for farmer drop-off and intake</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDrops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deliveries in the intake queue.</p>
            ) : (
              pendingDrops.slice(0, 5).map((order) => (
                <div key={order.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.quantity || 0} units waiting</p>
                    </div>
                    <Badge variant="secondary">{String(order.status || 'pending').toUpperCase()}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionLoading[`status-${order.id}-received_at_centre`]} onClick={() => handleStatusUpdate(order.id, 'received_at_centre')}>
                      {actionLoading[`status-${order.id}-received_at_centre`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Receive at centre
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openQualityCheck(buildOrderRecord(order))}>Quality check</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operations team</CardTitle>
          <CardDescription>Internal staff assigned to intake, quality inspection, and dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          {opsUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operations staff has been created yet. Use the admin user management flow to create one.</p>
          ) : (
            <div className="space-y-3">
              {opsUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.status || 'Active'}</Badge>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderQueue = () => (
    <Card>
      <CardHeader>
        <CardTitle>Centre intake queue</CardTitle>
        <CardDescription>Farmer shipments arriving at the operations collection centre</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingDrops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending deliveries in the intake queue.</p>
        ) : (
          pendingDrops.map((order) => (
            <div key={order.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">{order.quantity || 0} units waiting</p>
                </div>
                <Badge variant="secondary">{String(order.status || 'pending').toUpperCase()}</Badge>
              </div>
              <div className="flex gap-2">
                {normalizeStatus(order.status) === 'sent_to_operations_centre' && (
                  <Button size="sm" disabled={actionLoading[`status-${order.id}-received_at_centre`]} onClick={() => handleStatusUpdate(order.id, 'received_at_centre')}>
                    {actionLoading[`status-${order.id}-received_at_centre`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Received at centre
                  </Button>
                )}
                {(normalizeStatus(order.status) === 'received_at_centre' || normalizeStatus(order.status) === 'sent_to_operations_centre') && (
                  <Button size="sm" variant="outline" disabled={actionLoading[`status-${order.id}-quality_check`]} onClick={() => handleStatusUpdate(order.id, 'quality_check')}>
                    {actionLoading[`status-${order.id}-quality_check`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Move to quality check
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  const downloadQualityReport = (check: any) => {
    const payload = {
      id: check.id,
      order_id: check.order_id,
      crop_id: check.crop_id,
      decision: check.decision,
      status: check.status,
      quality_score: Number(check.quality_score ?? 0),
      notes: check.notes || '',
      defects: Array.isArray(check.defects) ? check.defects : [],
      color_analysis: check.color_analysis || {},
      quantity_accepted: check.quantity_accepted ?? null,
      created_at: check.created_at || null,
      image_url: check.image_url || null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quality-report-order-${check.order_id || check.id}-${new Date(check.created_at || Date.now()).toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report downloaded', description: `Quality report for order #${check.order_id || check.id} was downloaded.` });
  };

  const renderQuality = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quality & packing board</CardTitle>
          <CardDescription>Orders receiving quality checks or packing approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {qualityChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quality checks currently in progress.</p>
          ) : (
            qualityChecks.map((order) => (
              <div key={order.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">Grade review and packing</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-700">{formatStatusLabel(String(order.status || 'quality_check')).toUpperCase()}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openQualityCheck(buildOrderRecord(order))}>Run quality check</Button>
                  <Button size="sm" variant="outline" disabled={actionLoading[`status-${order.id}-ready_for_dispatch`]} onClick={() => handleStatusUpdate(order.id, 'ready_for_dispatch')}>
                    {actionLoading[`status-${order.id}-ready_for_dispatch`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark ready
                  </Button>
                  <Button size="sm" variant="outline" disabled={actionLoading[`status-${order.id}-packed`]} onClick={() => handleStatusUpdate(order.id, 'packed')}>
                    {actionLoading[`status-${order.id}-packed`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pack order
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent quality results</CardTitle>
          <CardDescription>Latest product freshness and quality decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentQualityChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quality results have been recorded yet.</p>
          ) : (
            recentQualityChecks.map((check) => {
              const isExpanded = Boolean(expandedQualityIds[check.id]);
              const defects = Array.isArray(check.defects) ? check.defects : [];
              const colorAnalysis = check.color_analysis || {};

              return (
                <div key={check.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{check.order_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.created_at ? new Date(check.created_at).toLocaleString() : 'Recent'}
                      </p>
                    </div>
                    <Badge
                      className={
                        check.decision === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : check.decision === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }
                    >
                      {String(check.decision || 'pending').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Freshness score</p>
                      <p className="font-medium">{Number(check.quality_score || 0).toFixed(1)}/100</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{String(check.status || 'pending')}</p>
                    </div>
                  </div>

                  {check.image_url ? (
                    <img
                      src={check.image_url}
                      alt={`Quality check for order ${check.order_id}`}
                      className="h-24 w-full rounded-md object-cover border"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed bg-muted/20 text-xs text-muted-foreground">
                      No image preview
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleQualityDetails(check.id)}>
                      {isExpanded ? 'Hide details' : 'View details'}
                    </Button>
                    <Button size="sm" onClick={() => downloadQualityReport(check)}>
                      Download report
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 rounded-md bg-muted/20 p-3 text-sm">
                      {check.notes && (
                        <div>
                          <p className="text-muted-foreground">Notes</p>
                          <p className="break-words">{check.notes}</p>
                        </div>
                      )}

                      {defects.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Detected issues</p>
                          <ul className="list-disc pl-5">
                            {defects.map((defect: any, index: number) => (
                              <li key={`${check.id}-defect-${index}`}>
                                {typeof defect === 'string' ? defect : defect?.type || 'Unknown defect'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {colorAnalysis && (colorAnalysis.brightness !== undefined || colorAnalysis.saturation !== undefined) && (
                        <div>
                          <p className="text-muted-foreground">Color analysis</p>
                          <p>Brightness: {Number(colorAnalysis.brightness ?? 0).toFixed(2)}</p>
                          <p>Saturation: {Number(colorAnalysis.saturation ?? 0).toFixed(2)}</p>
                        </div>
                      )}

                      {check.quantity_accepted !== null && check.quantity_accepted !== undefined && (
                        <div>
                          <p className="text-muted-foreground">Accepted quantity</p>
                          <p>{check.quantity_accepted}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderHistory = () => {
    const [orderFilter, setOrderFilter] = useState('');
    const [decisionFilter, setDecisionFilter] = useState('all');

    const filteredChecks = useMemo(() => {
      const normalizedOrder = orderFilter.trim();
      return qualityHistory.filter((check) => {
        const matchesOrder = !normalizedOrder || String(check.order_id).includes(normalizedOrder);
        const matchesDecision = decisionFilter === 'all' || String(check.decision || 'pending') === decisionFilter;
        return matchesOrder && matchesDecision;
      });
    }, [decisionFilter, orderFilter, qualityHistory]);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality history</CardTitle>
          <CardDescription>Complete quality-check log with filters and downloadable reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Filter by order</label>
              <Input
                value={orderFilter}
                onChange={(event) => setOrderFilter(event.target.value)}
                placeholder="Search order #"
              />
            </div>
            <div className="md:w-56">
              <label className="mb-1 block text-sm font-medium">Decision</label>
              <select
                value={decisionFilter}
                onChange={(event) => setDecisionFilter(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All decisions</option>
                <option value="approved">Approved</option>
                <option value="partial">Partial</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOrderFilter('');
                  setDecisionFilter('all');
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {filteredChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quality records match your current filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredChecks.map((check) => (
                <div key={check.id} className="rounded-md border p-3 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">Order #{check.order_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.created_at ? new Date(check.created_at).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        check.decision === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : check.decision === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }>
                        {String(check.decision || 'pending').toUpperCase()}
                      </Badge>
                      <Button size="sm" onClick={() => downloadQualityReport(check)}>
                        Download report
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">{Number(check.quality_score || 0).toFixed(1)}/100</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{String(check.status || 'pending')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Accepted qty</p>
                      <p className="font-medium">{check.quantity_accepted ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Decision</p>
                      <p className="font-medium">{String(check.decision || 'pending')}</p>
                    </div>
                  </div>

                  {check.notes && (
                    <p className="text-sm text-muted-foreground break-words">{check.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDispatch = () => (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch board</CardTitle>
        <CardDescription>Orders ready for shipment or in transit to buyers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {dispatch.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders in dispatch or delivery.</p>
        ) : (
          dispatch.map((order) => (
            <div key={order.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {['ready_for_dispatch', 'packed'].includes(normalizeStatus(order.status)) ? 'Ready for carrier assignment' : 'In transit to buyer'}
                  </p>
                  {order.tracking_number && <p className="text-xs text-muted-foreground">Tracking: {order.tracking_number}</p>}
                </div>
                <Badge className="bg-blue-500/10 text-blue-700">{formatStatusLabel(String(order.status || 'dispatched')).toUpperCase()}</Badge>
              </div>
              <div className="space-y-2 rounded-md border border-dashed p-2">
                <div className="flex gap-2">
                  <select
                    value={dispatchDrafts[order.id]?.provider || 'sendstack'}
                    onChange={(event) => setDispatchDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        provider: event.target.value,
                        tracking_number: current[order.id]?.tracking_number || '',
                        tracking_url: current[order.id]?.tracking_url || '',
                      },
                    }))}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="sendstack">Sendstack</option>
                    <option value="gig">GIG Logistics</option>
                    <option value="other">Other courier</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={dispatchDrafts[order.id]?.tracking_number || ''}
                    onChange={(event) => setDispatchDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        provider: current[order.id]?.provider || 'gig',
                        tracking_number: event.target.value,
                        tracking_url: current[order.id]?.tracking_url || '',
                      },
                    }))}
                    placeholder="Tracking number"
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={dispatchDrafts[order.id]?.tracking_url || ''}
                    onChange={(event) => setDispatchDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        provider: current[order.id]?.provider || 'gig',
                        tracking_number: current[order.id]?.tracking_number || '',
                        tracking_url: event.target.value,
                      },
                    }))}
                    placeholder="Tracking URL"
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={actionLoading[`dispatch-${order.id}`]} onClick={() => handleDispatchAssignment(order.id)}>
                    {actionLoading[`dispatch-${order.id}`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign dispatch
                  </Button>
                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-blue-600 underline">
                      Open tracking
                    </a>
                  )}
                  <Button size="sm" variant="outline" disabled={actionLoading[`status-${order.id}-delivered`]} onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                    {actionLoading[`status-${order.id}-delivered`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark delivered
                  </Button>
                </div>
                {normalizeStatus(order.status) === 'dispatched' && !order.tracking_url && (
                  <p className="text-xs text-amber-700">Courier tracking has not been supplied yet. Add the real tracking number and URL before sharing this shipment.</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  const renderDelivered = () => {
    const deliveredOrders = orders.filter((order) => normalizeStatus(order.status) === 'delivered');

    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivered orders</CardTitle>
          <CardDescription>Orders confirmed as delivered to the buyer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {deliveredOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivered orders yet.</p>
          ) : (
            deliveredOrders.map((order) => (
              <div key={order.id} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.quantity || 0} units delivered</p>
                    {order.tracking_number && <p className="text-xs text-muted-foreground">Tracking: {order.tracking_number}</p>}
                  </div>
                  <Badge className="w-fit bg-green-500/10 text-green-700">DELIVERED</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-blue-600 underline">
                      Open tracking
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate(`/delivery-tracking/${order.id}`)}>
                    View delivery timeline
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  const renderMarketDemand = () => (
    <Card>
      <CardHeader>
        <CardTitle>Market demand analysis</CardTitle>
        <CardDescription>Rank buyer locations where produce is most likely to move, especially when stock is nearing spoilage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <label className="mb-1 block text-sm font-medium" htmlFor="demand-crop-type">Crop type</label>
            <Input id="demand-crop-type" value={demandCropType} onChange={(event) => setDemandCropType(event.target.value)} placeholder="e.g. tomato" />
          </div>
          <Button type="button" disabled={demandLoading || !demandCropType.trim()} onClick={() => setDemandCropType((value) => value.trim().toLowerCase())}>
            {demandLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze demand
          </Button>
        </div>

        {demandLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Analyzing market demand...</div>
        ) : !demandData ? (
          <p className="text-sm text-muted-foreground">No demand analysis is available for this crop yet.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3"><p className="text-sm text-muted-foreground">Crop analyzed</p><p className="font-semibold">{demandData.cropType}</p></div>
              <div className="rounded-md border p-3"><p className="text-sm text-muted-foreground">Available stock near spoilage</p><p className="font-semibold">{demandData.nearSpoilageStock || 0} units</p></div>
            </div>
            {demandData.candidateLocations?.length ? (
              <div className="space-y-3">
                {demandData.candidateLocations.map((candidate: any, index: number) => (
                  <div key={candidate.location} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-medium">{index + 1}. {candidate.location}</p><p className="text-sm text-muted-foreground">{candidate.recentOrders} recent orders · {candidate.fulfilledOrders} fulfilled · {candidate.quantityOrdered} units ordered</p></div>
                    <Badge className="w-fit">Score {candidate.predictedDemandScore}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No buyer locations are available for this crop yet.</p>}
            <p className="text-xs text-muted-foreground">{demandData.methodology}</p>
            <p className="text-xs font-medium text-primary">Data source: {demandData.dataSource}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderPayouts = () => (
    <Card>
      <CardHeader>
        <CardTitle>Payout approval queue</CardTitle>
        <CardDescription>Farmer payouts awaiting approval and processing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingPayouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending payouts.</p>
        ) : (
          pendingPayouts.map((payout) => (
            <div key={payout.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Payout #{payout.id}</p>
                  <p className="text-sm text-muted-foreground">{payout.farmer?.name || 'Unknown'} - Order #{payout.order_id}</p>
                  <p className="text-lg font-semibold">GHS {Number(payout.amount || 0).toFixed(2)}</p>
                </div>
                <Badge variant="secondary">PENDING</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={actionLoading[`payout-${payout.id}`]} onClick={() => handlePayoutApproval(payout.id)}>
                  {actionLoading[`payout-${payout.id}`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve &amp; process
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  const renderTeam = () => (
    <Card>
      <CardHeader>
        <CardTitle>Operations team</CardTitle>
        <CardDescription>Internal staff assigned to intake, quality inspection, and dispatch</CardDescription>
      </CardHeader>
      <CardContent>
        {opsUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No operations staff has been created yet. Use the admin user management flow to create one.</p>
        ) : (
          <div className="space-y-3">
            {opsUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.status || 'Active'}</Badge>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const sectionContent = {
    dashboard: renderDashboard(),
    queue: renderQueue(),
    quality: renderQuality(),
    history: renderHistory(),
    dispatch: renderDispatch(),
    delivered: renderDelivered(),
    'market-demand': renderMarketDemand(),
    payouts: renderPayouts(),
    team: renderTeam(),
  };

  return (
    <OperationsLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isAdminMode ? 'Operations Team' : 'Operations Portal'}</h1>
            <p className="text-sm text-muted-foreground">
              {isAdminMode
                ? `Collection point, quality checks, packing, and dispatch overview for ${todayLabel()}`
                : `Today’s intake, quality, dispatch, and payout tasks for ${todayLabel()}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading operations dashboard...</div>
        ) : (
          sectionContent[section]
        )}

        {loadError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>

      {selectedOrder && (
        <QualityCheckForm
          order={selectedOrder}
          isOpen={qualityDialogOpen}
          onClose={() => {
            setQualityDialogOpen(false);
            setSelectedOrder(null);
          }}
          onComplete={handleQualityComplete}
        />
      )}
    </OperationsLayout>
  );
};

export default OperationsSectionPage;
