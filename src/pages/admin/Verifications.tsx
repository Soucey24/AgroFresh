import { useEffect, useState } from "react";
import { Clock3, FileText, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { approveFarmerVerification, getPendingFarmerVerifications, rejectFarmerVerification } from "@/api";

const Verifications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await getPendingFarmerVerifications();
      if (!data.error) {
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load farmer verifications', error);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Farmer Approvals</h1>
            <p className="text-muted-foreground">Review farmer onboarding verification before they can list produce.</p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {applications.length} pending
          </Badge>
        </div>

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
                        <img
                          src={application.photo_url}
                          alt="Farmer verification photo"
                          className="h-52 w-full cursor-zoom-in rounded-lg object-cover border border-border/50"
                          onClick={() => setPreviewImage({ url: application.photo_url, name: 'Farmer verification photo' })}
                        />
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
                                    className="h-48 w-full cursor-zoom-in object-contain bg-background p-2"
                                    onClick={() => setPreviewImage({ url: doc.url, name: documentName })}
                                  />
                                ) : isPdf && doc.url ? (
                                  <iframe title={documentName} src={doc.url} className="h-48 w-full bg-background" />
                                ) : (
                                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
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
      </div>
    </AdminLayout>
  );
};

export default Verifications;
