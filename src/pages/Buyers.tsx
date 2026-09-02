import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Clock, Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { getProfile, getReviewsForCrop, listCrops } from "../api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getImageUrl } from "../utils/imageUtils";

interface Crop {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category?: string | null;
  listingLocation?: string | null;
  description: string;
  farmer: string;
  location: string;
  harvestDate: string;
  expiryDate: string;
  image?: string;
  qualityScore?: number;
  freshnessStatus?: string;
  averageRating?: number;
  reviewCount?: number;
  farmerId?: number;
  farmerBio?: string | null;
  farmerAvatar?: string | null;
  farmerVerified?: boolean;
}

const Buyers = () => {
  const categories = [
    { value: "all", label: "All produce" },
    { value: "Vegetables", label: "Vegetables" },
    { value: "Fruits", label: "Fruits" },
    { value: "Grains", label: "Grains" },
    { value: "Spices", label: "Spices" },
    { value: "Oil", label: "Oil" },
    { value: "Cereals", label: "Cereals" },
    { value: "LifeStocks", label: "Livestock" },
  ];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [user, setUser] = useState<{ id?: number | string } | null>(null);
  const [cart, setCart] = useState<Array<{crop: Crop, quantity: number}>>([]);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<any[]>([]);
  const navigate = useNavigate();

  const getCartStorageKey = (currentUser?: { id?: number | string } | null) =>
    currentUser?.id ? `cart_${currentUser.id}` : 'cart_guest';

  const getCropCategory = (crop: Crop) => {
    if (crop.category?.trim()) return crop.category.trim();

    const searchableText = `${crop.name} ${crop.description}`.toLowerCase();
    if (/spice|pepper|ginger|garlic|turmeric|clove|cinnamon/.test(searchableText)) return 'Spices';
    if (/oil|palm|coconut/.test(searchableText)) return 'Oil';
    if (/cereal|maize|corn|millet|oat|rice|wheat/.test(searchableText)) return 'Cereals';
    if (/grain|bean|soy|sorghum|groundnut|peanut/.test(searchableText)) return 'Grains';
    if (/fruit|mango|banana|orange|pineapple|pawpaw|watermelon/.test(searchableText)) return 'Fruits';
    if (/livestock|goat|sheep|cattle|chicken|poultry|pig/.test(searchableText)) return 'LifeStocks';
    return 'Vegetables';
  };

  useEffect(() => {
    getProfile()
      .then((profile) => {
        if (profile && !profile.error) {
          setUser(profile);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!selectedCrop) {
      setSelectedReviews([]);
      return;
    }
    getReviewsForCrop(Number(selectedCrop.id)).then((data) => {
      setSelectedReviews(Array.isArray(data) ? data : []);
    }).catch(() => setSelectedReviews([]));
  }, [selectedCrop]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedCart = localStorage.getItem(getCartStorageKey(user));
      setCart(storedCart ? JSON.parse(storedCart) : []);
    } catch {
      setCart([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getCartStorageKey(user), JSON.stringify(cart));
  }, [cart, user?.id]);

  useEffect(() => {
    listCrops().then(data => {
      if (Array.isArray(data)) setCrops(data);
    });
  }, []);

  const isDigitalAddress = (value: string) => /^[A-Z]{1,3}-\d{3,}-\d+$/i.test(String(value || '').trim());
  const getListingLocation = (crop: Crop) => crop.listingLocation || crop.location;
  const displayLocation = (location: string) => isDigitalAddress(location) ? 'Location unavailable' : location;

  const filteredCrops = crops.filter(crop => {
    const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crop.farmer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" ||
                 getCropCategory(crop).toLowerCase() === selectedCategory.toLowerCase();
    const matchesLocation = locationFilter === "all" || displayLocation(getListingLocation(crop)) === locationFilter;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const addToCart = (crop: Crop, quantity: number) => {
    const existingItem = cart.find(item => item.crop.id === crop.id);
    const nextCart = existingItem
      ? cart.map(item => 
          item.crop.id === crop.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [...cart, { crop, quantity }];

    setCart(nextCart);
    setAddedItemIds(prev => ({ ...prev, [crop.id]: true }));

    window.setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [crop.id]: false }));
    }, 1200);

    toast.success(`${crop.name} added to cart`, {
      description: `${quantity} ${crop.unit} added to your basket.`
    });
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.crop.price * item.quantity), 0);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const trimmedExpiryDate = String(expiryDate).trim();
    const numericDate = Number(trimmedExpiryDate);
    if (/^\d+$/.test(trimmedExpiryDate) && numericDate <= 0) return null;
    const expiry = new Date(
      Number.isFinite(numericDate) && numericDate > 0
        ? (numericDate < 100000000000 ? numericDate * 1000 : numericDate)
        : trimmedExpiryDate,
    );
    if (Number.isNaN(expiry.getTime())) return null;
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const locations = Array.from(new Set(crops.map((crop) => displayLocation(getListingLocation(crop))).filter((location) => location && location !== 'Location unavailable'))).sort();

  useEffect(() => {
    console.log('[Buyers] location trace', crops.map((crop) => ({
      id: crop.id,
      name: crop.name,
      listingLocation: crop.listingLocation || null,
      fallbackLocation: crop.location || null,
      resolvedLocation: getListingLocation(crop),
      displayedLocation: displayLocation(getListingLocation(crop)),
    })));
    console.log('[Buyers] location filter options', locations);
  }, [crops, locations.join('|')]);

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundSlideshow />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Fresh Produce Marketplace</h1>
              <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/checkout')}>
                <ShoppingCart className="h-4 w-4" />
                Cart ({getTotalItems()})
                {getTotalItems() > 0 && (
                  <span className="text-sm">- GH₵ {getTotalPrice().toFixed(2)}</span>
                )}
              </Button>
            </div>
          </div>

          {user && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <div className="font-semibold">Build trust with your feedback</div>
                  <p className="text-sm text-muted-foreground">Rate farmers, write reviews, or report an order issue from My Orders.</p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/buyer-orders')}>Open My Orders</Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-lg border border-border/50 bg-card/40 p-4 backdrop-blur-sm lg:sticky lg:top-6">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Filter className="h-4 w-4 text-primary" />
                Categories
              </div>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === category.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 rounded-lg bg-card/40 p-4 backdrop-blur-sm sm:p-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search crops or farmers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <label className="relative block">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <select
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Filter by farmer location"
                    >
                      <option value="all">All farmer locations</option>
                      {locations.length > 0 ? locations.map((location) => (
                        <option key={location} value={location}>{location}</option>
                      )) : (
                        <option value="no-locations" disabled>No physical locations available</option>
                      )}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredCrops.map((crop) => {
              const daysUntilExpiry = getDaysUntilExpiry(crop.expiryDate);
              
                  return (
                <Card key={crop.id} onClick={() => setSelectedCrop(crop)} className="cursor-pointer bg-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{crop.name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">{crop.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {crop.qualityScore && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                            {crop.qualityScore}% Quality
                          </Badge>
                        )}
                        {daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 2 && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            Expires in {daysUntilExpiry} days
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {crop.image ? (
                      <img
                        src={getImageUrl(crop.image)}
                        alt={crop.name}
                        className="w-full h-32 sm:h-40 object-cover rounded"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-32 sm:h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          GH₵ {crop.price}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">per {crop.unit}</span>
                      </div>
                      
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{displayLocation(getListingLocation(crop))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">Expires: {crop.expiryDate}</span>
                        </div>
                        <div className="text-muted-foreground truncate">
                          Farmer: {crop.farmer}
                        </div>
                        {crop.averageRating != null && (
                          <div className="flex items-center gap-1 text-sm text-amber-600">
                            <Star className="h-4 w-4 fill-amber-400" />
                            <span>{crop.averageRating.toFixed(1)} farmer rating</span>
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          Available: {crop.quantity} {crop.unit}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Input 
                          onClick={(event) => event.stopPropagation()}
                          type="number" 
                          placeholder="Qty" 
                          className="w-full sm:w-20" 
                          min="1" 
                          max={crop.quantity}
                          id={`quantity-${crop.id}`}
                        />
                        <Button 
                          className={`gap-2 ${addedItemIds[crop.id] ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`} 
                          onClick={(event) => {
                            event.stopPropagation();
                            const quantityInput = document.getElementById(`quantity-${crop.id}`) as HTMLInputElement;
                            const quantity = parseInt(quantityInput?.value || "1");
                            if (quantity > 0 && quantity <= crop.quantity) {
                              addToCart(crop, quantity);
                              quantityInput.value = "";
                            } else {
                              toast.error(`Enter a quantity between 1 and ${crop.quantity}.`);
                            }
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span className="hidden sm:inline">{addedItemIds[crop.id] ? 'Added ✓' : 'Add to Cart'}</span>
                          <span className="sm:hidden">{addedItemIds[crop.id] ? 'Added' : 'Add'}</span>
                        </Button>
                      </div>
                      {addedItemIds[crop.id] && (
                        <div className="mt-2 text-xs text-emerald-600 font-medium">Item added to your cart</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedCrop(null)}>
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedCrop.name}</CardTitle>
                  <CardDescription>Product and farmer details</CardDescription>
                </div>
                {selectedCrop.farmerVerified && <Badge className="bg-emerald-600 text-white">Verified farmer</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                {selectedCrop.image ? <img src={getImageUrl(selectedCrop.image)} alt={selectedCrop.name} className="h-40 w-full rounded object-cover" /> : <div className="flex h-40 items-center justify-center rounded bg-muted text-muted-foreground">No Image</div>}
                <div className="space-y-2 text-sm">
                  <div className="text-2xl font-bold text-primary">GH₵ {selectedCrop.price} <span className="text-sm font-normal text-muted-foreground">per {selectedCrop.unit}</span></div>
                  <p>{selectedCrop.description || 'No product description provided.'}</p>
                  <p className="text-muted-foreground">Available: {selectedCrop.quantity} {selectedCrop.unit}</p>
                  <p className="text-muted-foreground">Expires: {selectedCrop.expiryDate}</p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  {selectedCrop.farmerAvatar ? <img src={getImageUrl(selectedCrop.farmerAvatar)} alt={selectedCrop.farmer} className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{selectedCrop.farmer.slice(0, 1)}</div>}
                  <div>
                    <div className="flex items-center gap-2 font-semibold">{selectedCrop.farmer}{selectedCrop.farmerVerified && <Badge variant="outline" className="border-emerald-500 text-emerald-700">Verified</Badge>}</div>
                    <div className="text-sm text-muted-foreground">{displayLocation(getListingLocation(selectedCrop))}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{selectedCrop.farmerBio || 'This farmer has not added a profile description yet.'}</p>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {selectedCrop.averageRating?.toFixed(1) || 'No rating'} ({selectedCrop.reviewCount || selectedReviews.length} reviews)</div>
                <div className="space-y-2">{selectedReviews.slice(0, 5).map((review) => <div key={review.id} className="rounded border p-3 text-sm"><div className="font-medium">{review.user_name || 'Buyer'} · {review.rating}/5</div>{review.comment && <p className="mt-1 text-muted-foreground">{review.comment}</p>}</div>)}</div>
                {!selectedReviews.length && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
              </div>
              <Button className="w-full" onClick={() => { setSelectedCrop(null); navigate('/buyer-orders'); }}>View My Orders and Reviews</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Buyers;
