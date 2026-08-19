import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin/AdminLayout";
import { approveFarmerVerification, getPendingFarmerVerifications, rejectFarmerVerification } from "@/api";

const Verifications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

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

                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Ghana Card</p>
                        <p className="mt-1 font-medium">{application.ghana_card_number || '—'}</p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Farm Name</p>
                        <p className="mt-1 font-medium">{application.farm_name || '—'}</p>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3 md:col-span-2 xl:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Association / Place</p>
                        <p className="mt-1 font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {application.farmers_association_address || application.location_text || '—'}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                        <p className="mt-1 font-medium">{application.location_text || '—'}</p>
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
                          className="h-52 w-full rounded-lg object-cover border border-border/50"
                        />
                      </div>
                    ) : null}

                    {docs.length > 0 ? (
                      <div className="rounded-lg border border-border/50 p-3">
                        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Supporting Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {docs.map((doc, index) => (
                            <a
                              key={`${doc.name || 'doc'}-${index}`}
                              href={doc.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm hover:bg-muted/60"
                            >
                              {doc.name || `Document ${index + 1}`}
                            </a>
                          ))}
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
