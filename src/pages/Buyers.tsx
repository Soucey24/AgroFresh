import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Clock, Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { listCrops } from "../api";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";

interface Crop {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  description: string;
  farmer: string;
  location: string;
  harvestDate: string;
  expiryDate: string;
  image?: string;
}

const Buyers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<Array<{crop: Crop, quantity: number}>>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    listCrops().then(data => {
      if (Array.isArray(data)) setCrops(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const filteredCrops = crops.filter(crop => {
    const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crop.farmer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           crop.name.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const addToCart = (crop: Crop, quantity: number) => {
    const existingItem = cart.find(item => item.crop.id === crop.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.crop.id === crop.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { crop, quantity }]);
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.crop.price * item.quantity), 0);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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

          {/* Search and Filters */}
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search crops or farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="tomato">Tomatoes</SelectItem>
                  <SelectItem value="onion">Onions</SelectItem>
                  <SelectItem value="pepper">Peppers</SelectItem>
                  <SelectItem value="cassava">Cassava</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredCrops.map((crop) => {
              const daysUntilExpiry = getDaysUntilExpiry(crop.expiryDate);
              
              return (
                <Card key={crop.id} className="bg-card/40 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{crop.name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">{crop.description}</CardDescription>
                      </div>
                      {daysUntilExpiry <= 2 && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          Expires in {daysUntilExpiry} days
                        </Badge>
                      )}
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
                          <span className="truncate">{crop.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">Expires: {crop.expiryDate}</span>
                        </div>
                        <div className="text-muted-foreground truncate">
                          Farmer: {crop.farmer}
                        </div>
                        <div className="text-muted-foreground">
                          Available: {crop.quantity} {crop.unit}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Input 
                          type="number" 
                          placeholder="Qty" 
                          className="w-full sm:w-20" 
                          min="1" 
                          max={crop.quantity}
                          id={`quantity-${crop.id}`}
                        />
                        <Button 
                          className="gap-2" 
                          onClick={() => {
                            const quantityInput = document.getElementById(`quantity-${crop.id}`) as HTMLInputElement;
                            const quantity = parseInt(quantityInput?.value || "1");
                            if (quantity > 0 && quantity <= crop.quantity) {
                              addToCart(crop, quantity);
                              quantityInput.value = "";
                            }
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span className="hidden sm:inline">Add to Cart</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Buyers;
