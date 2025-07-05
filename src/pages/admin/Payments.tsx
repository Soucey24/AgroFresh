import { useState, useEffect } from "react";
import { Search, Filter, Eye, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import PaymentStatusTracker from "@/components/PaymentStatusTracker";
import { getPaymentStatus } from "../../api";

interface Payment {
  id: number;
  order_id: number;
  buyer_id: number;
  farmer_id: number;
  amount: number;
  payment_method: string;
  phone_number?: string;
  transaction_id?: string;
  reference_id: string;
  status: string;
  payment_provider?: string;
  created_at: string;
  completed_at?: string;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockPayments: Payment[] = [
      {
        id: 1,
        order_id: 101,
        buyer_id: 1,
        farmer_id: 2,
        amount: 150.00,
        payment_method: "mtn-momo",
        phone_number: "0241234567",
        transaction_id: "MM-123456789",
        reference_id: "AGRO-1703123456-ABCD",
        status: "completed",
        payment_provider: "mobile_money",
        created_at: "2024-01-15T10:30:00Z",
        completed_at: "2024-01-15T10:32:00Z"
      },
      {
        id: 2,
        order_id: 102,
        buyer_id: 3,
        farmer_id: 4,
        amount: 75.50,
        payment_method: "vodafone-cash",
        phone_number: "0209876543",
        transaction_id: "VC-987654321",
        reference_id: "AGRO-1703123457-EFGH",
        status: "processing",
        payment_provider: "mobile_money",
        created_at: "2024-01-15T11:15:00Z"
      },
      {
        id: 3,
        order_id: 103,
        buyer_id: 5,
        farmer_id: 6,
        amount: 200.00,
        payment_method: "card",
        transaction_id: "CARD-456789123",
        reference_id: "AGRO-1703123458-IJKL",
        status: "failed",
        payment_provider: "card_processor",
        created_at: "2024-01-15T12:00:00Z"
      },
      {
        id: 4,
        order_id: 104,
        buyer_id: 7,
        farmer_id: 8,
        amount: 120.75,
        payment_method: "bank-transfer",
        transaction_id: "BANK-789123456",
        reference_id: "AGRO-1703123459-MNOP",
        status: "pending",
        payment_provider: "bank_transfer",
        created_at: "2024-01-15T13:45:00Z"
      }
    ];

    setPayments(mockPayments);
    setLoading(false);
  }, []);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.reference_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.phone_number?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'mtn-momo':
      case 'vodafone-cash':
      case 'airteltigo-money':
        return '📱';
      case 'card':
        return '💳';
      case 'bank-transfer':
        return '🏦';
      default:
        return '💰';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'mtn-momo': return 'MTN MoMo';
      case 'vodafone-cash': return 'Vodafone Cash';
      case 'airteltigo-money': return 'AirtelTigo Money';
      case 'card': return 'Card';
      case 'bank-transfer': return 'Bank Transfer';
      default: return method;
    }
  };

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedAmount = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = payments
    .filter(payment => payment.status === 'pending' || payment.status === 'processing')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const stats = [
    {
      title: "Total Payments",
      value: payments.length,
      icon: DollarSign,
      color: "text-blue-600"
    },
    {
      title: "Completed",
      value: payments.filter(p => p.status === 'completed').length,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Pending",
      value: payments.filter(p => p.status === 'pending' || p.status === 'processing').length,
      icon: TrendingDown,
      color: "text-yellow-600"
    },
    {
      title: "Total Amount",
      value: `GH₵ ${totalAmount.toFixed(2)}`,
      icon: DollarSign,
      color: "text-purple-600"
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading payments...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Monitor and manage all payment transactions</p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span>{stat.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, transaction ID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="mtn-momo">MTN MoMo</SelectItem>
                    <SelectItem value="vodafone-cash">Vodafone Cash</SelectItem>
                    <SelectItem value="airteltigo-money">AirtelTigo Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments ({filteredPayments.length})</CardTitle>
            <CardDescription>All payment transactions with real-time status updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Method</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{payment.reference_id}</div>
                        <div className="text-xs text-muted-foreground">Order #{payment.order_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getMethodIcon(payment.payment_method)}</span>
                          <span className="text-sm">{getMethodLabel(payment.payment_method)}</span>
                        </div>
                        {payment.phone_number && (
                          <div className="text-xs text-muted-foreground">{payment.phone_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">GH₵ {payment.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Payment Details
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(null)}>
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PaymentStatusTracker
                  paymentId={selectedPayment.id}
                  amount={selectedPayment.amount}
                  showDetails={true}
                  autoRefresh={true}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Payment Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Reference:</strong> {selectedPayment.reference_id}</div>
                      <div><strong>Transaction ID:</strong> {selectedPayment.transaction_id || 'N/A'}</div>
                      <div><strong>Method:</strong> {getMethodLabel(selectedPayment.payment_method)}</div>
                      <div><strong>Provider:</strong> {selectedPayment.payment_provider || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Order Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Order ID:</strong> #{selectedPayment.order_id}</div>
                      <div><strong>Buyer ID:</strong> {selectedPayment.buyer_id}</div>
                      <div><strong>Farmer ID:</strong> {selectedPayment.farmer_id}</div>
                      <div><strong>Amount:</strong> GH₵ {selectedPayment.amount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Created:</strong> {new Date(selectedPayment.created_at).toLocaleString()}</div>
                    {selectedPayment.completed_at && (
                      <div><strong>Completed:</strong> {new Date(selectedPayment.completed_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Payments; 