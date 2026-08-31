import { useEffect, useState } from "react";
import { Clock3, FileText, MapPin, Phone, ShieldCheck, Users, Loader2, AlertCircle, CheckCircle2, XCircle, Search, Filter, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  approveFarmerVerification, 
  getPendingFarmerVerifications, 
  rejectFarmerVerification,
  getVerificationStats,
  getUnverifiedUsers,
  getUserVerification,
  approveUserVerification,
  rejectUserVerification
} from "@/api";

const Verifications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  
  // Operations staff verification states
  const [operationsUsers, setOperationsUsers] = useState([]);
  const [operationsStats, setOperationsStats] = useState<any>(null);
  const [selectedOperationsUser, setSelectedOperationsUser] = useState<any>(null);
  const [operationsModalOpen, setOperationsModalOpen] = useState(false);
  const [operationsActionLoading, setOperationsActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [operationsSearchTerm, setOperationsSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'operations' | 'farmers'>('operations');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const [farmerData, statsData, operationsDataRes] = await Promise.all([
        getPendingFarmerVerifications().then(data => Array.isArray(data) ? data : []),
        getVerificationStats().catch(() => null),
        getUnverifiedUsers('operations').catch(() => ({ users: [] }))
      ]);
      
      setApplications(farmerData);
      setOperationsStats(statsData);
      setOperationsUsers(operationsDataRes?.users || []);
    } catch (error) {
      console.error('Failed to load verifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDecision = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const result = action === 'approve'
        ? await approveFarmerVerification(id)
        : await rejectFarmerVerification(id);

      if (result?.error) {
        alert(result.error);
        return;
      }

      setApplications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error(`Failed to ${action} verification`, error);
      alert(`Unable to ${action} this farmer right now.`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const handleOperationsApprove = async () => {
    if (!selectedOperationsUser) return;
    setOperationsActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await approveUserVerification(selectedOperationsUser.id);
      
      setSuccessMessage(`${selectedOperationsUser.name} approved successfully!`);
      setOperationsModalOpen(false);
      setRejectionReason('');
      setTimeout(() => fetchApplications(), 500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Approval failed');
    } finally {
      setOperationsActionLoading(false);
    }
  };

  const handleOperationsReject = async () => {
    if (!selectedOperationsUser) return;

    setOperationsActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await rejectUserVerification(selectedOperationsUser.id, rejectionReason || 'Verification not approved');
      
      setSuccessMessage(`${selectedOperationsUser.name} rejected. SMS notification sent.`);
      setOperationsModalOpen(false);
      setRejectionReason('');
      setTimeout(() => fetchApplications(), 500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Rejection failed');
    } finally {
      setOperationsActionLoading(false);
    }
  };

  const viewOperationsDetails = (user: any) => {
    setSelectedOperationsUser(user);
    setRejectionReason('');
    setOperationsModalOpen(true);
  };

  const filteredOperationsUsers = operationsUsers.filter(user =>
    user.name.toLowerCase().includes(operationsSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(operationsSearchTerm.toLowerCase()) ||
    (user.phone || '').includes(operationsSearchTerm)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Verification Dashboard</h1>
            <p className="text-muted-foreground">Review operations staff and farmer verifications.</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Stats */}
        {operationsStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Operations Staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <Badge variant="outline">{operationsStats.operations?.pending || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approved</span>
                  <Badge className="bg-green-100 text-green-800">{operationsStats.operations?.approved || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <Badge className="bg-red-100 text-red-800">{operationsStats.operations?.rejected || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Farmers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <Badge variant="outline">{operationsStats.farmers?.pending || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approved</span>
                  <Badge className="bg-green-100 text-green-800">{operationsStats.farmers?.approved || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <Badge className="bg-red-100 text-red-800">{operationsStats.farmers?.rejected || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'operations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 mr-2 inline" />
            Operations Staff ({operationsUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'farmers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-2 inline" />
            Farmers ({applications.length})
          </button>
        </div>

        {/* Operations Staff Tab */}
        {activeTab === 'operations' && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Operations Staff Verifications</CardTitle>
              <CardDescription>Review Ghana card and face photos for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={operationsSearchTerm}
                  onChange={(e) => setOperationsSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* List */}
              {filteredOperationsUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending operations staff verifications</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOperationsUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">📱 {user.phone} • 📅 {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" onClick={() => viewOperationsDetails(user)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Farmers Tab */}
        {activeTab === 'farmers' && (
          <>
            {loading ? (
              <Card>
                <CardContent className="flex min-h-[220px] items-center justify-center text-muted-foreground">
                  Loading farmer applications...
                </CardContent>
              </Card>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-center gap-3">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">No pending approvals</h2>
                    <p className="text-muted-foreground">All farmer verification requests have been reviewed.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
          <div className="grid gap-6">
            {applications.map((application) => {
              const farmer = application.user || {};
              const docs = Array.isArray(application.documents) ? application.documents : [];

              return (
                <Card key={application.id} className="overflow-hidden border-border/70">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-xl">{farmer.name || 'Farmer'}</CardTitle>
                        <CardDescription>
                          Submitted {formatDate(application.submitted_at)}
                        </CardDescription>
                      </div>
                      <Badge className="w-fit bg-amber-500/10 text-amber-700 border border-amber-500/30">
                        <Clock3 className="h-3.5 w-3.5 mr-1" />
                        {application.status || 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                        <p className="mt-1 font-medium">{farmer.email || '—'}</p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                        <p className="mt-1 font-medium flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {application.phone || '—'}</p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3 md:col-span-2 xl:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Association / Place</p>
                        <p className="mt-1 font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {application.farmers_association_address || application.location_text || '—'}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Farm and crop details</p>
                        <p className="mt-1 font-medium">Crops: {application.crops_produced || '—'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Years farming: {application.years_farming ?? '—'} · FDA: {application.fda_registration_number || '—'}</p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                        <p className="mt-1 font-medium">{[application.region, application.district, application.town_village].filter(Boolean).join(', ') || application.location_text || '—'}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Lat: {application.latitude ?? '—'} · Lng: {application.longitude ?? '—'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Review Notes</p>
                        <p className="mt-1 font-medium">{application.review_notes || 'No notes added yet.'}</p>
                      </div>
                    </div>

                    {application.photo_url ? (
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Profile Photo</p>
                        <button
                          type="button"
                          className="block w-full max-w-[220px] overflow-hidden rounded-lg border border-border/50 bg-muted/20 text-left"
                          onClick={() => setPreviewImage({ url: application.photo_url, name: 'Farmer verification photo' })}
                          aria-label="View farmer verification photo"
                        >
                          <img
                            src={application.photo_url}
                            alt="Farmer verification photo"
                            className="aspect-square w-full cursor-zoom-in object-cover"
                          />
                        </button>
                      </div>
                    ) : null}

                    {docs.length > 0 ? (
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Supporting Documents</p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {docs.map((doc, index) => {
                            const documentName = doc.name || `Document ${index + 1}`;
                            const isImage = /^image\//i.test(doc.mimeType || doc.mimetype || '') || /\.(jpe?g|png|webp|gif)$/i.test(documentName);
                            const isPdf = /\.pdf$/i.test(documentName) || doc.mimeType === 'application/pdf' || doc.mimetype === 'application/pdf';

                            return (
                              <div key={`${documentName}-${index}`} className="overflow-hidden rounded-lg border border-border/50 bg-muted/20">
                                <div className="border-b border-border/50 px-3 py-2 text-sm font-medium truncate" title={documentName}>{documentName}</div>
                                {isImage && doc.url ? (
                                  <img
                                    src={doc.url}
                                    alt={documentName}
                                    className="aspect-[4/3] w-full cursor-zoom-in object-contain bg-background p-2"
                                    onClick={() => setPreviewImage({ url: doc.url, name: documentName })}
                                  />
                                ) : isPdf && doc.url ? (
                                  <iframe title={documentName} src={doc.url} className="aspect-[4/3] w-full bg-background" />
                                ) : (
                                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <FileText className="h-10 w-10" />
                                    <span className="text-xs">Preview unavailable</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
                            <DialogContent className="max-w-5xl p-4">
                              <DialogTitle>{previewImage?.name || 'Image preview'}</DialogTitle>
                              {previewImage && (
                                <img
                                  src={previewImage.url}
                                  alt={previewImage.name}
                                  className="max-h-[75vh] w-full object-contain"
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        disabled={processingId === application.id}
                        onClick={() => handleDecision(application.id, 'approve')}
                      >
                        {processingId === application.id ? 'Approving...' : 'Approve Farmer'}
                      </Button>

                      <Button
                        variant="destructive"
                        disabled={processingId === application.id}
                        onClick={() => handleDecision(application.id, 'reject')}
                      >
                        {processingId === application.id ? 'Rejecting...' : 'Reject Farmer'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
            )}
          </>
        )}

        {/* Operations Staff Photo Review Modal */}
        {operationsModalOpen && selectedOperationsUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold">{selectedOperationsUser.name}</h2>
                <button
                  onClick={() => setOperationsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedOperationsUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedOperationsUser.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-medium capitalize">{selectedOperationsUser.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{new Date(selectedOperationsUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Ghana Card Photo */}
                <div>
                  <p className="text-lg font-semibold mb-3">Ghana Card</p>
                  {selectedOperationsUser.ghana_card_photo ? (
                    <img
                      src={typeof selectedOperationsUser.ghana_card_photo === 'string' && selectedOperationsUser.ghana_card_photo.startsWith('data:')
                        ? selectedOperationsUser.ghana_card_photo
                        : `data:image/jpeg;base64,${selectedOperationsUser.ghana_card_photo}`}
                      alt="Ghana Card"
                      className="max-w-full h-auto border rounded"
                    />
                  ) : (
                    <p className="text-gray-500">No Ghana card photo uploaded</p>
                  )}
                </div>

                {/* Face Photo */}
                <div>
                  <p className="text-lg font-semibold mb-3">Face Photo</p>
                  {selectedOperationsUser.face_photo ? (
                    <img
                      src={typeof selectedOperationsUser.face_photo === 'string' && selectedOperationsUser.face_photo.startsWith('data:')
                        ? selectedOperationsUser.face_photo
                        : `data:image/jpeg;base64,${selectedOperationsUser.face_photo}`}
                      alt="Face Photo"
                      className="max-w-full h-auto border rounded"
                    />
                  ) : (
                    <p className="text-gray-500">No face photo uploaded</p>
                  )}
                </div>

                {/* Verification Score (if available) */}
                {selectedOperationsUser.verification_notes && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <p className="text-sm text-blue-800">{selectedOperationsUser.verification_notes}</p>
                  </div>
                )}

                {/* Rejection Reason Input (if rejecting) */}
                {rejectionReason !== '' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why verification is being rejected..."
                      className="w-full p-2 border rounded text-sm"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t bg-gray-50">
                <Button
                  onClick={() => setOperationsModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleOperationsReject(selectedOperationsUser.id)}
                  variant="destructive"
                  disabled={operationsActionLoading}
                  className="flex-1"
                >
                  {operationsActionLoading ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => handleOperationsApprove(selectedOperationsUser.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={operationsActionLoading}
                >
                  {operationsActionLoading ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Verifications;
