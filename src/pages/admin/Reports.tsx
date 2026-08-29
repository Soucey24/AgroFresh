import { useEffect, useState } from "react";
import { Activity, Download, FileBarChart, RefreshCw, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin/AdminLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getCropStats,
  getDashboardStats,
  getOrderStats,
  getPaymentStats,
  getPendingFarmerVerifications,
  getRecentActivity,
  listUsers,
} from "@/api";

const numberValue = (value: unknown) => Number(value || 0).toLocaleString();
const moneyValue = (value: unknown) => `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ReportUser = { role?: string };
type ReportActivity = { action?: string; name?: string; created_at?: string };
type SystemReport = {
  dashboard: { totalUsers: number; activeListings: number; ordersToday: number };
  crops: { expiringSoon: number; expired: number };
  orders: { completed: number; inTransit: number; pending: number; cancelled: number };
  payments: { totalPayments: number; completed: { count: number; amount: number }; pending: { count: number; amount: number }; failed: number };
  users: ReportUser[];
  approvals: unknown[];
  activity: ReportActivity[];
};

const Reports = () => {
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, crops, orders, payments, users, approvals, activity] = await Promise.all([
        getDashboardStats(),
        getCropStats(),
        getOrderStats(),
        getPaymentStats(),
        listUsers(),
        getPendingFarmerVerifications(),
        getRecentActivity(),
      ]);

      const failed = [dashboard, crops, orders, payments, users, approvals, activity].find((item) => item?.error);
      if (failed) throw new Error(failed.error);

      setReport({
        dashboard,
        crops,
        orders,
        payments,
        users: Array.isArray(users) ? users : users.users || [],
        approvals: Array.isArray(approvals) ? approvals : [],
        activity: Array.isArray(activity) ? activity : [],
      });
    } catch (loadError: unknown) {
      console.error("Failed to load admin report", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load the system report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const exportReport = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Total users", report.dashboard.totalUsers],
      ["Active listings", report.dashboard.activeListings],
      ["Orders today", report.dashboard.ordersToday],
      ["Completed revenue", report.payments.completed.amount],
      ["Total payments", report.payments.totalPayments],
      ["Completed orders", report.orders.completed],
      ["Pending orders", report.orders.pending],
      ["In-transit orders", report.orders.inTransit],
      ["Cancelled orders", report.orders.cancelled],
      ["Pending farmer approvals", report.approvals.length],
      ["Expiring listings", report.crops.expiringSoon],
      ["Expired listings", report.crops.expired],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `agrofresh-system-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfReport = () => {
    if (!report) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("AgroFresh System Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    const summaryRows = [
      ["Metric", "Value"],
      ["Total Users", numberValue(report.dashboard.totalUsers)],
      ["Active Listings", numberValue(report.dashboard.activeListings)],
      ["Orders Today", numberValue(report.dashboard.ordersToday)],
      ["Completed Revenue", moneyValue(report.payments.completed.amount)],
      ["Total Payments", numberValue(report.payments.totalPayments)],
      ["Completed Orders", numberValue(report.orders.completed)],
      ["Pending Orders", numberValue(report.orders.pending)],
      ["In Transit Orders", numberValue(report.orders.inTransit)],
      ["Cancelled Orders", numberValue(report.orders.cancelled)],
      ["Pending Approvals", numberValue(report.approvals.length)],
      ["Expiring Listings", numberValue(report.crops.expiringSoon)],
      ["Expired Listings", numberValue(report.crops.expired)],
    ];

    autoTable(doc, {
      head: [summaryRows[0]],
      body: summaryRows.slice(1),
      startY: 32,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [32, 139, 75] },
    });

    const userRoleRows = Object.entries(userCounts).map(([role, count]) => [role, numberValue(count)]);
    const activityRows = report.activity.slice(0, 5).map((item) => [item.action || "Activity", item.name || "-", item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"]);

    const finalY = (doc as any).lastAutoTable?.finalY || 32;
    doc.setFontSize(12);
    doc.text("User Breakdown", 14, finalY + 12);
    autoTable(doc, {
      head: [["Role", "Count"]],
      body: userRoleRows.length ? userRoleRows : [["No data", "0"]],
      startY: finalY + 18,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [32, 139, 75] },
    });

    const activityY = (doc as any).lastAutoTable?.finalY || finalY + 18;
    doc.text("Recent Activity", 14, activityY + 12);
    autoTable(doc, {
      head: [["Activity", "Name", "Date"]],
      body: activityRows.length ? activityRows : [["No activity", "-", "-"]],
      startY: activityY + 18,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [32, 139, 75] },
    });

    doc.save(`agrofresh-system-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const userCounts = report?.users.reduce((counts: Record<string, number>, user: ReportUser) => {
    const role = user.role || "unknown";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {}) || {};

  if (loading) {
    return <AdminLayout><div className="flex min-h-64 items-center justify-center text-muted-foreground">Loading system report...</div></AdminLayout>;
  }

  if (error || !report) {
    return <AdminLayout><Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-4"><p className="text-destructive">{error || "Report unavailable"}</p><Button onClick={loadReport}><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button></CardContent></Card></AdminLayout>;
  }

  const summary = [
    ["Users", numberValue(report.dashboard.totalUsers), Users],
    ["Active listings", numberValue(report.dashboard.activeListings), FileBarChart],
    ["Orders today", numberValue(report.dashboard.ordersToday), ShoppingCart],
    ["Completed revenue", moneyValue(report.payments.completed.amount), Activity],
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-3xl font-bold">System Reports</h1><p className="text-muted-foreground">A live operational view of users, listings, orders, payments, and approvals.</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={loadReport}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button><Button variant="secondary" onClick={exportReport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button><Button onClick={exportPdfReport}><Download className="mr-2 h-4 w-4" /> Export PDF</Button></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.map(([label, value, Icon]) => <Card key={String(label)}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p></CardContent></Card>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Current order pipeline</CardDescription></CardHeader><CardContent className="space-y-3">{[["Completed", report.orders.completed], ["In transit", report.orders.inTransit], ["Pending", report.orders.pending], ["Cancelled", report.orders.cancelled]].map(([label, value]) => <div className="flex justify-between" key={String(label)}><span>{label}</span><Badge variant="secondary">{numberValue(value)}</Badge></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Payments</CardTitle><CardDescription>Financial processing summary</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span>Completed</span><span className="font-medium">{numberValue(report.payments.completed.count)} · {moneyValue(report.payments.completed.amount)}</span></div><div className="flex justify-between"><span>Pending</span><span className="font-medium">{numberValue(report.payments.pending.count)} · {moneyValue(report.payments.pending.amount)}</span></div><div className="flex justify-between"><span>Failed</span><Badge variant="destructive">{numberValue(report.payments.failed)}</Badge></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Listings and approvals</CardTitle><CardDescription>Items requiring attention</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span>Expiring soon</span><Badge variant="secondary">{numberValue(report.crops.expiringSoon)}</Badge></div><div className="flex justify-between"><span>Expired</span><Badge variant="secondary">{numberValue(report.crops.expired)}</Badge></div><div className="flex justify-between"><span>Pending approvals</span><Badge className="bg-amber-500/10 text-amber-700">{numberValue(report.approvals.length)}</Badge></div></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>User breakdown</CardTitle><CardDescription>Accounts by role</CardDescription></CardHeader><CardContent className="space-y-3">{Object.entries(userCounts).map(([role, count]) => <div className="flex justify-between" key={role}><span className="capitalize">{role}</span><Badge variant="secondary">{numberValue(count)}</Badge></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Latest system events</CardDescription></CardHeader><CardContent className="space-y-3">{report.activity.slice(0, 8).map((item: ReportActivity, index: number) => <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0" key={`${item.created_at}-${index}`}><div><p className="font-medium">{item.action}</p><p className="text-sm text-muted-foreground">{item.name}</p></div><span className="text-xs text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span></div>)}</CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle><ShieldCheck className="mr-2 inline h-5 w-5 text-primary" />Report scope</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">This report uses live records from the users, crops, orders, payments, farmer approvals, and activity services.</CardContent></Card>
      </div>
    </AdminLayout>
  );
};

export default Reports;
