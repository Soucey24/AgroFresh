import { useState, useEffect } from "react";
import { Search, Filter, Eye, Download, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import PaymentStatusTracker from "@/components/PaymentStatusTracker";
import { getPaymentStatus, getPaymentHistory, getPaymentStats, getAdminPayments } from "../../api";
import { toast } from "@/components/ui/sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    completed: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: 0
  });
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try admin endpoint first, fallback to regular endpoint
        let paymentsData;
        try {
          paymentsData = await getAdminPayments(1, 100);
        } catch (adminError) {
          paymentsData = await getPaymentHistory(1, 100);
        }
        
        const statsData = await getPaymentStats();
        
        // Handle both possible response formats
        if (!paymentsData.error) {
          const paymentsArray = paymentsData.payments || paymentsData;
          if (Array.isArray(paymentsArray)) {
            setPayments(paymentsArray);
          } else {
            console.error('Unexpected payments data format:', paymentsArray);
            setPayments([]);
          }
        }
        
        if (!statsData.error) {
          setPaymentStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching payments data:', error);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const completedAmount = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const pendingAmount = payments
    .filter(payment => payment.status === 'pending' || payment.status === 'processing')
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  const stats = [
    {
      title: "Total Payments",
      value: paymentStats.totalPayments,
      icon: DollarSign,
      color: "text-blue-600"
    },
    {
      title: "Completed",
      value: paymentStats.completed.count,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Pending",
      value: paymentStats.pending.count,
      icon: TrendingDown,
      color: "text-yellow-600"
    },
    {
      title: "Total Amount",
      value: `GH₵ ${((parseFloat(paymentStats.completed.amount) || 0) + (parseFloat(paymentStats.pending.amount) || 0)).toFixed(2)}`,
      icon: DollarSign,
      color: "text-purple-600"
    }
  ];

  const exportPaymentsReport = () => {
    setExporting(true);
    
    try {
      // Use filtered or all payments based on export scope
      const paymentsToExport = exportScope === 'filtered' ? filteredPayments : payments;
      
      // Calculate summary statistics
      const totalAmount = paymentsToExport.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const completedAmount = paymentsToExport
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const pendingAmount = paymentsToExport
        .filter(payment => payment.status === 'pending' || payment.status === 'processing')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      
      const statusCounts = paymentsToExport.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const methodCounts = paymentsToExport.reduce((acc, payment) => {
        const method = getMethodLabel(payment.payment_method);
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Create CSV content with summary
      const summarySection = [
        'PAYMENT REPORT SUMMARY',
        `Generated on: ${new Date().toLocaleString()}`,
        `Export Scope: ${exportScope === 'filtered' ? 'Filtered Results' : 'All Payments'}`,
        `Total Payments: ${paymentsToExport.length}`,
        `Total Amount: GH₵ ${totalAmount.toFixed(2)}`,
        `Completed Amount: GH₵ ${completedAmount.toFixed(2)}`,
        `Pending Amount: GH₵ ${pendingAmount.toFixed(2)}`,
        '',
        'Status Breakdown:',
        ...Object.entries(statusCounts).map(([status, count]) => `${status.toUpperCase()}: ${count}`),
        '',
        'Payment Method Breakdown:',
        ...Object.entries(methodCounts).map(([method, count]) => `${method}: ${count}`),
        '',
        'DETAILED PAYMENT RECORDS',
        ''
      ];

      const headers = [
        'Reference ID',
        'Order ID',
        'Payment Method',
        'Phone Number',
        'Amount (GH₵)',
        'Status',
        'Transaction ID',
        'Created Date',
        'Completed Date'
      ];

      const paymentRecords = paymentsToExport.map(payment => [
        payment.reference_id,
        payment.order_id,
        getMethodLabel(payment.payment_method),
        payment.phone_number || 'N/A',
        (parseFloat(payment.amount) || 0).toFixed(2),
        payment.status.toUpperCase(),
        payment.transaction_id || 'N/A',
        new Date(payment.created_at).toLocaleString(),
        payment.completed_at ? new Date(payment.completed_at).toLocaleString() : 'N/A'
      ]);

      const csvContent = [
        ...summarySection,
        headers.join(','),
        ...paymentRecords.map(record => record.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments-report-${exportScope}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Payments report (${exportScope}) exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export payments report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const exportPaymentsPDF = () => {
    setExportingPDF(true);
    
    try {
      // Use filtered or all payments based on export scope
      const paymentsToExport = exportScope === 'filtered' ? filteredPayments : payments;
      
      // Calculate summary statistics
      const totalAmount = paymentsToExport.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const completedAmount = paymentsToExport
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const pendingAmount = paymentsToExport
        .filter(payment => payment.status === 'pending' || payment.status === 'processing')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      
      const statusCounts = paymentsToExport.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const methodCounts = paymentsToExport.reduce((acc, payment) => {
        const method = getMethodLabel(payment.payment_method);
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Create PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('AgroFresh GH - Payment Report', 20, 20);
      
      // Add generation info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`Export Scope: ${exportScope === 'filtered' ? 'Filtered Results' : 'All Payments'}`, 20, 35);
      doc.text(`Total Payments: ${paymentsToExport.length}`, 20, 40);
      
      // Add summary statistics
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', 20, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Amount: GH₵ ${totalAmount.toFixed(2)}`, 20, 65);
      doc.text(`Completed Amount: GH₵ ${completedAmount.toFixed(2)}`, 20, 70);
      doc.text(`Pending Amount: GH₵ ${pendingAmount.toFixed(2)}`, 20, 75);
      
      // Add status breakdown
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Status Breakdown', 20, 90);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 100;
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.text(`${status.toUpperCase()}: ${count}`, 20, yPos);
        yPos += 5;
      });
      
      // Add payment method breakdown
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method Breakdown', 20, yPos + 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos += 20;
      Object.entries(methodCounts).forEach(([method, count]) => {
        doc.text(`${method}: ${count}`, 20, yPos);
        yPos += 5;
      });
      
      // Add detailed payment records table
      if (paymentsToExport.length > 0) {
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Payment Records', 20, 20);
        
        // Prepare table data
        const tableData = paymentsToExport.map(payment => [
          payment.reference_id,
          payment.order_id.toString(),
          getMethodLabel(payment.payment_method),
          payment.phone_number || 'N/A',
          `GH₵ ${(parseFloat(payment.amount) || 0).toFixed(2)}`,
          payment.status.toUpperCase(),
          payment.transaction_id || 'N/A',
          new Date(payment.created_at).toLocaleDateString(),
          payment.completed_at ? new Date(payment.completed_at).toLocaleDateString() : 'N/A'
        ]);
        
        // Add table using autoTable
        autoTable(doc, {
          startY: 30,
          head: [['Reference', 'Order ID', 'Method', 'Phone', 'Amount', 'Status', 'Transaction ID', 'Created', 'Completed']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 25 }, // Reference
            1: { cellWidth: 15 }, // Order ID
            2: { cellWidth: 20 }, // Method
            3: { cellWidth: 20 }, // Phone
            4: { cellWidth: 20 }, // Amount
            5: { cellWidth: 15 }, // Status
            6: { cellWidth: 25 }, // Transaction ID
            7: { cellWidth: 20 }, // Created
            8: { cellWidth: 20 }  // Completed
          }
        });
      }
      
      // Save PDF
      doc.save(`payments-report-${exportScope}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success(`Payments report (${exportScope}) exported as PDF successfully!`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Failed to export PDF report. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <Select value={exportScope} onValueChange={(value: 'filtered' | 'all') => setExportScope(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filtered">Filtered Results</SelectItem>
                <SelectItem value="all">All Payments</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={exportPaymentsReport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'CSV'}
            </Button>
            <Button className="gap-2" onClick={exportPaymentsPDF} disabled={exportingPDF}>
              <FileText className="h-4 w-4" />
              {exportingPDF ? 'Exporting PDF...' : 'PDF'}
            </Button>
          </div>
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
                        <div className="text-sm font-medium">GH₵ {(parseFloat(payment.amount) || 0).toFixed(2)}</div>
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
                  amount={parseFloat(selectedPayment.amount) || 0}
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
                      <div><strong>Amount:</strong> GH₵ {(parseFloat(selectedPayment.amount) || 0).toFixed(2)}</div>
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