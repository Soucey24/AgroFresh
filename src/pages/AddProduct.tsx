import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmerLayout from "@/components/FarmerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Leaf, ArrowLeft, ArrowRight, ImageUp, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { createCrop, updateCrop } from "../api";
import { useToast } from "@/hooks/use-toast";

const cropCategories = [
  "Vegetables",
  "Fruits",
  "Cereals",
  "Grains",
  "Spices",
  "Root Crops",
  "Legumes",
  "Oil Crops",
  "Herbs",
  "Other"
];

const units = ["kg", "g", "bags", "bunches", "crates", "pieces", "boxes"]; 

const defaultForm = {
  name: "",
  category: "Vegetables",
  variety: "",
  quantity: "",
  unit: "kg",
  harvestDate: "",
  storageCondition: "room_temp",
  description: "",
  price: "",
  minimumPrice: "",
  deliveryType: "pickup",
  location: "",
  notes: "",
};

const AddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cropId, setCropId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const stepLabel = useMemo(() => {
    const labels = {
      1: "Product basics",
      2: "Photo upload",
      3: "Pricing & logistics",
      4: "Review & publish",
    };
    return labels[step as keyof typeof labels] || "Product basics";
  }, [step]);

  const updateField = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files).slice(0, 3);
    const nextPreviews = selected.map((file) => URL.createObjectURL(file));

    setImageFiles(selected);
    setPreviews(nextPreviews);
  };

  const createDraftCrop = async () => {
    const name = form.name.trim();
    if (!name) throw new Error("Product name is required.");
    if (!form.quantity || Number(form.quantity) <= 0) throw new Error("Quantity must be greater than 0.");
    if (!form.harvestDate) throw new Error("Harvest date is required.");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", form.description.trim() || `${form.category} from ${form.location || "farm"}`);
    formData.append("price", String(form.price || 0));
    formData.append("quantity", String(form.quantity));
    formData.append("unit", form.unit);
    formData.append("planting_date", form.harvestDate);
    formData.append("status", "draft");
    formData.append("image", imageFiles[0] || "");

    const result = await createCrop(formData);
    if (result?.error) {
      throw new Error(result.error);
    }
    if (!result?.id) {
      throw new Error("Could not create a draft product.");
    }

    return Number(result.id);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim()) return "Please enter the product name.";
      if (!form.category) return "Please select a crop category.";
      if (!form.quantity || Number(form.quantity) <= 0) return "Please enter a valid quantity.";
      if (!form.harvestDate) return "Please choose the harvest date.";
      return "";
    }

    if (step === 2) {
      if (imageFiles.length === 0) return "Please upload at least one product photo.";
      return "";
    }

    if (step === 3) {
      if (!form.price || Number(form.price) <= 0) return "Please enter a valid selling price.";
      if (!form.location.trim()) return "Please enter the product location.";
      return "";
    }

    if (step === 4) {
      return "";
    }

    return "";
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    if (step === 1 && !cropId) {
      try {
        setLoading(true);
        const createdId = await createDraftCrop();
        setCropId(createdId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unable to save the product draft.";
        setError(message);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (step < 4) {
      setStep((current) => current + 1);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      setError("");

      let activeCropId = cropId;
      if (!activeCropId) {
        activeCropId = await createDraftCrop();
        setCropId(activeCropId);
      }

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim() || `${form.category} from ${form.location || "farm"}`);
      formData.append("price", String(form.price));
      formData.append("quantity", String(form.quantity));
      formData.append("unit", form.unit);
      formData.append("planting_date", form.harvestDate);
      formData.append("location", form.location.trim());
      formData.append("status", "draft");
      if (imageFiles[0]) formData.append("image", imageFiles[0]);
      if (form.notes.trim()) formData.append("notes", form.notes.trim());

      const result = await updateCrop(activeCropId, formData);
      if (result?.error) {
        throw new Error(result.error);
      }

      toast({ title: "Product submitted for review", description: "Your listing is pending admin approval and will become visible to buyers after approval." });
      navigate("/farmers#my-crops");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to publish this product right now.";
      setError(message);
      toast({ title: "Publish failed", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FarmerLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Farmer listing</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground">Add Product</h1>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-sm">
              Step {step} of 5
            </Badge>
          </div>

          <Card className="overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Leaf className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{stepLabel}</CardTitle>
                  <CardDescription>Keep the listing clear, ML-ready, and buyer-friendly.</CardDescription>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6 sm:p-8">
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Product name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="e.g. Fresh tomatoes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(value) => updateField("category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {cropCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="variety">Variety / type</Label>
                      <Input
                        id="variety"
                        value={form.variety}
                        onChange={(e) => updateField("variety", e.target.value)}
                        placeholder="e.g. Roma, local, hybrid"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) => updateField("quantity", e.target.value)}
                        placeholder="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={form.unit} onValueChange={(value) => updateField("unit", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="harvestDate">Harvest date</Label>
                      <Input
                        id="harvestDate"
                        type="date"
                        value={form.harvestDate}
                        onChange={(e) => updateField("harvestDate", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Storage condition</Label>
                      <Select
                        value={form.storageCondition}
                        onValueChange={(value) => updateField("storageCondition", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select storage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room_temp">Room temperature</SelectItem>
                          <SelectItem value="cold_storage">Cold storage</SelectItem>
                          <SelectItem value="refrigerated">Refrigerated</SelectItem>
                          <SelectItem value="ventilated">Ventilated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Short description</Label>
                      <Textarea
                        id="description"
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Add product details, quality notes, or freshness information."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ImageUp className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Upload product photos</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add a clear front photo and one close-up. Good photos improve quality scoring and buyer confidence.
                    </p>
                    <div className="mt-5">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageChange(e.target.files)}
                      />
                    </div>
                  </div>

                  {previews.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {previews.map((preview, index) => (
                        <img
                          key={`${preview}-${index}`}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="h-44 w-full rounded-xl object-cover border border-border/60"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price">Selling price (GHS)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => updateField("price", e.target.value)}
                        placeholder="18.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimumPrice">Minimum acceptable price</Label>
                      <Input
                        id="minimumPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.minimumPrice}
                        onChange={(e) => updateField("minimumPrice", e.target.value)}
                        placeholder="15.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Delivery option</Label>
                      <Select value={form.deliveryType} onValueChange={(value) => updateField("deliveryType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">Pickup only</SelectItem>
                          <SelectItem value="delivery">Delivery available</SelectItem>
                          <SelectItem value="pickup_delivery">Pickup and delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Farm / listing location</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => updateField("location", e.target.value)}
                        placeholder="e.g. Ejisu, Ashanti Region"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Buyer notes</Label>
                      <Textarea
                        id="notes"
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        rows={4}
                        placeholder="Optional: freshness notes, handling details, packaging, and delivery info."
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Review listing before publishing</h3>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Product</p>
                        <p className="mt-1 text-lg font-semibold">{form.name || "Untitled product"}</p>
                        <p className="text-sm text-muted-foreground">{form.category} • {form.variety || "No variety specified"}</p>
                      </div>

                      <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="mt-1 text-lg font-semibold">{form.quantity} {form.unit}</p>
                      </div>

                      <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="mt-1 text-lg font-semibold">GH₵ {Number(form.price || 0).toFixed(2)}</p>
                      </div>

                      <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="mt-1 text-lg font-semibold">{form.location || "Not provided"}</p>
                      </div>
                    </div>

                    {imageFiles.length > 0 && (
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {previews.map((preview, index) => (
                          <img
                            key={`${preview}-${index}`}
                            src={preview}
                            alt={`Listing ${index + 1}`}
                            className="h-28 w-full rounded-xl object-cover border border-border/60"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  {step > 1 && (
                    <Button variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {step < 4 ? (
                    <Button onClick={handleNext} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving draft...
                        </>
                      ) : (
                        <>
                          {step === 1 ? "Save draft and continue" : "Continue"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handlePublish} disabled={loading} className="bg-green-600 text-white hover:bg-green-700">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Publish listing
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FarmerLayout>
  );
};

export default AddProduct;
