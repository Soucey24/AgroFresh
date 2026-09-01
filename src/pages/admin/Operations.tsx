import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, CheckCircle2, ClipboardCheck, Truck, Users, Send, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import OperationsLayout from "@/components/operations/OperationsLayout";
import { createUser, getAdminOrders, listUsers, updateOrder, getPayouts, updatePayout } from "@/api";
import { QualityCheckForm } from "@/components/operations/QualityCheckForm";

const todayLabel = () => new Date().toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

type OrderRecord = {
  id: number;
  crop_id: number;
  status: string;
  quantity: number;
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

type OperationsSection = 'dashboard' | 'queue' | 'quality' | 'dispatch' | 'payouts' | 'team';

interface OperationsProps {
  section?: OperationsSection;
}

const Operations = ({ section }: OperationsProps) => {
  const location = useLocation();
  const isAdminMode = location.pathname.startsWith('/admin');
  const resolvedSection = section ?? (() => {
    if (location.pathname.endsWith('/queue')) return 'queue';
    if (location.pathname.endsWith('/quality')) return 'quality';
    if (location.pathname.endsWith('/dispatch')) return 'dispatch';
    if (location.pathname.endsWith('/payouts')) return 'payouts';
    if (location.pathname.endsWith('/team')) return 'team';
    return 'dashboard';
  })();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', location: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [dispatchDrafts, setDispatchDrafts] = useState<Record<number, { provider?: string; tracking_number?: string; tracking_url?: string }>>({});

  const buildOrderRecord = (order: any): OrderRecord => ({
    id: Number(order.id),
    crop_id: Number(order.crop_id ?? order.crop?.id ?? 0),
    quantity: Number(order.quantity ?? 0),
    status: String(order.status || 'pending'),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orderData, usersData, payoutData] = await Promise.all([
          getAdminOrders(),
          listUsers(),
          getPayouts(),
        ]);

        const finalOrders = Array.isArray(orderData) ? orderData : [];
        const finalUsers = Array.isArray(usersData) ? usersData : [];
        const finalPayouts = Array.isArray(payoutData) ? payoutData : [];

        setOrders(finalOrders);
        setUsers(finalUsers);
        setPayouts(finalPayouts);
      } catch (error) {
        console.error('Failed to load operations dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const opsUsers = useMemo(() => users.filter((user) => user.role === 'operations'), [users]);
  const pendingDrops = useMemo(
    () => orders.filter((order) => ['pending', 'paid', 'confirmed'].includes(String(order.status || '').toLowerCase())),
    [orders],
  );
  const qualityChecks = useMemo(
    () => orders.filter((order) => ['preparing', 'ready', 'packed'].includes(String(order.status || '').toLowerCase())),
    [orders],
  );
  const dispatch = useMemo(
    () => orders.filter((order) => ['shipped', 'dispatched', 'delivered'].includes(String(order.status || '').toLowerCase())),
    [orders],
  );
  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === 'pending'),
    [payouts],
  );

  const refreshOrders = async () => {
    const [refreshed, payoutRefresh] = await Promise.all([
      getAdminOrders(),
      getPayouts(),
    ]);
    if (!refreshed?.error) {
      setOrders(Array.isArray(refreshed) ? refreshed : []);
    }
    if (!payoutRefresh?.error) {
      setPayouts(Array.isArray(payoutRefresh) ? payoutRefresh : []);
    }
  };

  const handleStatusUpdate = async (orderId: number, nextStatus: string) => {
    const result = await updateOrder(orderId, { status: nextStatus });
    if (!result?.error) {
      await refreshOrders();
      setMessage(`Order #${orderId} moved to ${nextStatus}.`);
    } else {
      setMessage(result.error || 'Failed to update order status.');
    }
  };

  const handlePayoutApproval = async (payoutId: number) => {
    const result = await updatePayout(payoutId, { status: 'paid' });
    if (!result?.error) {
      await refreshOrders();
      setMessage(`Payout #${payoutId} approved and marked as paid.`);
    } else {
      setMessage(result.error || 'Failed to approve payout.');
    }
  };

  const handleDispatchAssignment = async (orderId: number) => {
    const draft = dispatchDrafts[orderId] ?? {};
    const provider = draft.provider || 'gig';
    const trackingNumber = draft.tracking_number || `GIG-${orderId}-${Date.now().toString().slice(-6)}`;
    const trackingUrl = draft.tracking_url || `https://www.giglogistics.com/track/${trackingNumber}`;

    const result = await updateOrder(orderId, {
      status: 'dispatched',
      delivery_status: 'In Transit',
      delivery_service: provider,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
    });

    if (!result?.error) {
      await refreshOrders();
      setMessage(`Order #${orderId} marked dispatched with ${provider.toUpperCase()} tracking.`);
    } else {
      setMessage(result.error || 'Failed to assign dispatch.');
    }
  };

  const openQualityCheck = (order: OrderRecord) => {
    setSelectedOrder(order);
    setQualityDialogOpen(true);
  };

  const handleQualityComplete = async () => {
    await refreshOrders();
    setQualityDialogOpen(false);
    setSelectedOrder(null);
  };

  const dispatched = useMemo(
    () => orders.filter((order) => ['shipped', 'dispatched', 'delivered', 'completed'].includes(String(order.status || '').toLowerCase())),
    [orders],
  );

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
        return;
      }

      setForm({ name: '', email: '', password: '', location: '', phone: '' });
      if (result?.sms_sent) {
        setMessage(`Operations staff created! Login credentials sent via SMS to ${form.phone}`);
      } else {
        setMessage(`Operations staff created successfully. SMS delivery failed: ${result?.sms_error || 'check Arkesel configuration and phone number.'}`);
      }

      // Refresh operations staff list
      const refreshed = await listUsers();
      if (!refreshed?.error) {
        setUsers(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (err) {
      setSaving(false);
      setMessage(`Error: ${err}`);
    }
  };

  const sectionCards = {
    dashboard: (
      <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                pendingDrops.slice(0, 5).map((order) => {
                  const normalizedOrder = buildOrderRecord(order);
                  return (
                    <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.quantity || 0} units waiting</p>
                        </div>
                        <Badge variant="secondary">{String(order.status || 'pending').toUpperCase()}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleStatusUpdate(normalizedOrder.id, 'confirmed')}>
                          Received at centre
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openQualityCheck(normalizedOrder)}>
                          Quality check
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality & packing board</CardTitle>
              <CardDescription>Orders receiving quality checks or packing approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualityChecks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quality checks currently in progress.</p>
              ) : (
                qualityChecks.slice(0, 5).map((order) => {
                  const normalizedOrder = buildOrderRecord(order);
                  return (
                    <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">Grade review and packing</p>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-700">{String(order.status || 'ready').toUpperCase()}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openQualityCheck(normalizedOrder)}>
                          Run quality check
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'ready')}>
                          Mark ready
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'packed')}>
                          Pack order
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispatch board</CardTitle>
              <CardDescription>Orders ready for shipment or in transit to buyers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dispatch.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in dispatch or delivery.</p>
              ) : (
                dispatch.slice(0, 5).map((order) => {
                  const normalizedOrder = buildOrderRecord(order);
                  return (
                    <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">In transit to buyer</p>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-700">{String(order.status || 'shipped').toUpperCase()}</Badge>
                      </div>
                      <div className="space-y-2 rounded-md border border-dashed p-2">
                        <div className="flex gap-2">
                          <select
                            value={dispatchDrafts[order.id]?.provider || 'gig'}
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
                            <option value="gig">GIG Logistics</option>
                            <option value="sendstack">Sendstack</option>
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
                          <Button size="sm" variant="outline" onClick={() => handleDispatchAssignment(normalizedOrder.id)}>
                            Assign dispatch
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'delivered')}>
                            Mark delivered
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout approval queue</CardTitle>
              <CardDescription>Farmer payouts awaiting approval and processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingPayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending payouts.</p>
              ) : (
                pendingPayouts.slice(0, 5).map((payout) => (
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
                      <Button size="sm" onClick={() => handlePayoutApproval(payout.id)}>
                        Approve & process
                      </Button>
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
    ),
    queue: (
      <Card>
        <CardHeader>
          <CardTitle>Collection point queue</CardTitle>
          <CardDescription>Orders waiting for farmer drop-off and intake</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingDrops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending deliveries in the intake queue.</p>
          ) : (
            pendingDrops.map((order) => {
              const normalizedOrder = buildOrderRecord(order);
              return (
                <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.quantity || 0} units waiting</p>
                    </div>
                    <Badge variant="secondary">{String(order.status || 'pending').toUpperCase()}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleStatusUpdate(normalizedOrder.id, 'confirmed')}>
                      Received at centre
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openQualityCheck(normalizedOrder)}>
                      Quality check
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    ),
    quality: (
      <Card>
        <CardHeader>
          <CardTitle>Quality & packing board</CardTitle>
          <CardDescription>Orders receiving quality checks or packing approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {qualityChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quality checks currently in progress.</p>
          ) : (
            qualityChecks.map((order) => {
              const normalizedOrder = buildOrderRecord(order);
              return (
                <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">Grade review and packing</p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-700">{String(order.status || 'ready').toUpperCase()}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openQualityCheck(normalizedOrder)}>
                      Run quality check
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'ready')}>
                      Mark ready
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'packed')}>
                      Pack order
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    ),
    dispatch: (
      <Card>
        <CardHeader>
          <CardTitle>Dispatch board</CardTitle>
          <CardDescription>Orders ready for shipment or in transit to buyers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dispatch.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders in dispatch or delivery.</p>
          ) : (
            dispatch.map((order) => {
              const normalizedOrder = buildOrderRecord(order);
              return (
                <div key={normalizedOrder.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">In transit to buyer</p>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-700">{String(order.status || 'shipped').toUpperCase()}</Badge>
                  </div>
                  <div className="space-y-2 rounded-md border border-dashed p-2">
                    <div className="flex gap-2">
                      <select
                        value={dispatchDrafts[order.id]?.provider || 'gig'}
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
                        <option value="gig">GIG Logistics</option>
                        <option value="sendstack">Sendstack</option>
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
                      <Button size="sm" variant="outline" onClick={() => handleDispatchAssignment(normalizedOrder.id)}>
                        Assign dispatch
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(normalizedOrder.id, 'delivered')}>
                        Mark delivered
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    ),
    payouts: (
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
                  <Button size="sm" onClick={() => handlePayoutApproval(payout.id)}>
                    Approve & process
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    ),
    team: (
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
    ),
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
          <>
            {resolvedSection === 'dashboard' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            )}

            {resolvedSection === 'dashboard' && isAdminMode && (
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

            {resolvedSection !== 'dashboard' ? sectionCards[resolvedSection] : sectionCards.dashboard}
          </>
        )}
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

export default Operations;
