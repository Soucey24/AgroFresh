import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Package, TrendingUp, DollarSign, Calendar, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { listCrops, createCrop, deleteCrop, updateCrop } from "../api";
import { getImageUrl } from "../utils/imageUtils";
import ImageDebugger from "../components/ImageDebugger";

interface Crop {
  id: number;
  name: string;
  category: string;
  quantity: number;
  price: number;
  expiryDate: string;
  image: string;
}

const initialCrops: Crop[] = [
  {
    id: 1,
    name: "Tomatoes",
    category: "Vegetables",
    quantity: 500,
    price: 2.50,
    expiryDate: "2024-08-15",
    image: "https://images.unsplash.com/photo-1560807605-ba5a6bb7c24a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dG9tYXRvfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 2,
    name: "Carrots",
    category: "Vegetables",
    quantity: 300,
    price: 1.80,
    expiryDate: "2024-08-20",
    image: "https://images.unsplash.com/photo-1598148502549-5609c14c8652?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2Fycm90fGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 3,
    name: "Bananas",
    category: "Fruits",
    quantity: 800,
    price: 0.90,
    expiryDate: "2024-08-10",
    image: "https://images.unsplash.com/photo-1587132172749-727532918f0d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFuYW5hfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60",
  },
];

const Farmers = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCrop, setNewCrop] = useState<Omit<Crop, "id">>({
    name: "",
    category: "Vegetables",
    quantity: 0,
    price: 0,
    expiryDate: "",
    image: "",
  });
  const [viewCrop, setViewCrop] = useState<Crop | null>(null);
  const [editCrop, setEditCrop] = useState<Crop | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  useEffect(() => {
    listCrops().then(data => {
      if (Array.isArray(data)) setCrops(data);
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCrop(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editCrop) {
      setEditCrop(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleSelectChange = (value: string) => {
    setNewCrop(prev => ({ ...prev, category: value }));
  };

  const handleEditSelectChange = (value: string) => {
    if (editCrop) {
      setEditCrop(prev => prev ? { ...prev, category: value } : null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditImageFile(e.target.files[0]);
    }
  };

  const handleAddCrop = async () => {
    const formData = new FormData();
    formData.append('name', newCrop.name);
    formData.append('description', newCrop.category);
    formData.append('price', String(newCrop.price));
    formData.append('quantity', String(newCrop.quantity));
    if (newCrop.expiryDate) {
      const date = new Date(newCrop.expiryDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      formData.append('expiry_date', `${yyyy}-${mm}-${dd}`);
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    const result = await createCrop(formData);
    if (!result.error) {
      setCrops([...crops, result]);
      setNewCrop({ name: '', category: 'Vegetables', quantity: 0, price: 0, expiryDate: '', image: '' });
      setImageFile(null);
      setIsDialogOpen(false);
    }
  };

  const handleUpdateCrop = async () => {
    if (!editCrop) return;
    
    const formData = new FormData();
    formData.append('name', editCrop.name);
    formData.append('description', editCrop.category);
    formData.append('price', String(editCrop.price));
    formData.append('quantity', String(editCrop.quantity));
    if (editCrop.expiryDate) {
      const date = new Date(editCrop.expiryDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      formData.append('expiry_date', `${yyyy}-${mm}-${dd}`);
    }
    if (editImageFile) {
      formData.append('image', editImageFile);
    }
    
    const result = await updateCrop(editCrop.id, formData);
    if (!result.error) {
      setCrops(crops.map(crop => crop.id === editCrop.id ? { ...crop, ...editCrop } : crop));
      setEditCrop(null);
      setEditImageFile(null);
    }
  };

  const handleDeleteCrop = async (id: number) => {
    const result = await deleteCrop(id);
    if (!result.error) {
      setCrops(crops.filter(crop => crop.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundSlideshow />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Your Farm Dashboard</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Manage your crops and sales</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Crop
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Crop</DialogTitle>
                    <DialogDescription>
                      Add a new crop to your inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="name" className="text-sm font-medium sm:text-right">
                        Name
                      </Label>
                      <Input id="name" name="name" value={newCrop.name} onChange={handleInputChange} className="sm:col-span-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="category" className="text-sm font-medium sm:text-right">
                        Category
                      </Label>
                      <Select onValueChange={handleSelectChange} defaultValue={newCrop.category} >
                        <SelectTrigger className="sm:col-span-3">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vegetables">Vegetables</SelectItem>
                          <SelectItem value="Fruits">Fruits</SelectItem>
                          <SelectItem value="Grains">Grains</SelectItem>
                          <SelectItem value="LifeStocks">LifeStocks</SelectItem>
                          <SelectItem value="Spices">Spices</SelectItem>
                          <SelectItem value="Oil">Oil</SelectItem>
                          <SelectItem value="Cereals">Cereals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="quantity" className="text-sm font-medium sm:text-right">
                        Quantity
                      </Label>
                      <Input type="number" id="quantity" name="quantity" value={String(newCrop.quantity)} onChange={handleInputChange} className="sm:col-span-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="price" className="text-sm font-medium sm:text-right">
                        Price
                      </Label>
                      <Input type="number" id="price" name="price" value={String(newCrop.price)} onChange={handleInputChange} className="sm:col-span-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="expiryDate" className="text-sm font-medium sm:text-right">
                        Expiry Date
                      </Label>
                      <Input type="date" id="expiryDate" name="expiryDate" value={newCrop.expiryDate} onChange={handleInputChange} className="sm:col-span-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="image" className="text-sm font-medium sm:text-right">
                        Image
                      </Label>
                      <Input type="file" id="image" name="image" accept="image/*" onChange={handleImageChange} className="sm:col-span-3" />
                    </div>
                  </div>
                  <Button type="submit" onClick={handleAddCrop} className="w-full">Add Crop</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                  <Package className="h-4 w-4" />
                  <span>Total Crops</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">All your listed crops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{crops.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4" />
                  <span>Total Quantity</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Total quantity of all crops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{crops.reduce((acc, crop) => acc + crop.quantity, 0)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4" />
                  <span>Average Price</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Average price per crop</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {crops.length > 0 ? (crops.reduce((acc, crop) => acc + crop.price, 0) / crops.length).toFixed(2) : "0.00"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4" />
                  <span>Expiring Soon</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Crops expiring in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {crops.filter(crop => {
                    const expiry = new Date(crop.expiryDate);
                    const now = new Date();
                    const diff = expiry.getTime() - now.getTime();
                    const days = Math.ceil(diff / (1000 * 3600 * 24));
                    return days <= 7;
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Button variant="secondary" className="flex items-center space-x-2 h-12">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">View Sales Report</span>
              </Button>
              <Button variant="secondary" className="flex items-center space-x-2 h-12">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Request Payment</span>
              </Button>
              <Button variant="secondary" className="flex items-center space-x-2 h-12">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Update Availability</span>
              </Button>
            </div>
          </div>

          {/* Recent Crops */}
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">Recent Crops</h2>
            
            {/* Mobile Cards View */}
            <div className="block sm:hidden space-y-4">
              {crops.map((crop) => (
                <Card key={crop.id} className="bg-card/60 backdrop-blur-sm border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                                                  {crop.image ? (
                            <img
                              src={getImageUrl(crop.image)}
                              alt={crop.name}
                              className="object-cover w-full h-full"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">{crop.name}</h3>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewCrop(crop)} className="h-8 w-8 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditCrop(crop)} className="h-8 w-8 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => handleDeleteCrop(crop.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Category: {crop.category}</div>
                          <div>Quantity: {crop.quantity}</div>
                          <div>Price: GH₵{crop.price}</div>
                          <div>Expires: {crop.expiryDate}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Image</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Quantity</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Expiry Date</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {crops.map((crop) => (
                    <tr key={crop.id} className="hover:bg-muted/50">
                      <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="h-12 w-12 rounded-lg overflow-hidden">
                          {crop.image ? (
                            <img
                              src={getImageUrl(crop.image)}
                              alt={crop.name}
                              className="object-cover w-full h-full"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-foreground">{crop.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{crop.category}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{crop.quantity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">GH₵{crop.price}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{crop.expiryDate}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewCrop(crop)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditCrop(crop)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCrop(crop.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {viewCrop && (
        <Dialog open={!!viewCrop} onOpenChange={() => setViewCrop(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crop Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {viewCrop.name}</p>
              <p><strong>Category:</strong> {viewCrop.category}</p>
              <p><strong>Quantity:</strong> {viewCrop.quantity}</p>
              <p><strong>Price:</strong> GH₵{viewCrop.price}</p>
              <p><strong>Expiry Date:</strong> {viewCrop.expiryDate}</p>
              {viewCrop.image && (
                <div>
                  <strong>Image:</strong>
                  <img src={getImageUrl(viewCrop.image)} alt={viewCrop.name} className="w-full h-32 object-cover rounded mt-2" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {editCrop && (
        <Dialog open={!!editCrop} onOpenChange={() => setEditCrop(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Crop</DialogTitle>
              <DialogDescription>
                Update the crop information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-name" className="text-sm font-medium sm:text-right">
                  Name
                </Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  value={editCrop.name} 
                  onChange={handleEditInputChange} 
                  className="sm:col-span-3" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-category" className="text-sm font-medium sm:text-right">
                  Category
                </Label>
                <Select onValueChange={handleEditSelectChange} value={editCrop.category}>
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vegetables">Vegetables</SelectItem>
                    <SelectItem value="Fruits">Fruits</SelectItem>
                    <SelectItem value="Grains">Grains</SelectItem>
                    <SelectItem value="LifeStocks">LifeStocks</SelectItem>
                    <SelectItem value="Spices">Spices</SelectItem>
                    <SelectItem value="Oil">Oil</SelectItem>
                    <SelectItem value="Cereals">Cereals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-quantity" className="text-sm font-medium sm:text-right">
                  Quantity
                </Label>
                <Input 
                  type="number" 
                  id="edit-quantity" 
                  name="quantity" 
                  value={String(editCrop.quantity)} 
                  onChange={handleEditInputChange} 
                  className="sm:col-span-3" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-price" className="text-sm font-medium sm:text-right">
                  Price
                </Label>
                <Input 
                  type="number" 
                  id="edit-price" 
                  name="price" 
                  value={String(editCrop.price)} 
                  onChange={handleEditInputChange} 
                  className="sm:col-span-3" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-expiryDate" className="text-sm font-medium sm:text-right">
                  Expiry Date
                </Label>
                <Input 
                  type="date" 
                  id="edit-expiryDate" 
                  name="expiryDate" 
                  value={editCrop.expiryDate} 
                  onChange={handleEditInputChange} 
                  className="sm:col-span-3" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-image" className="text-sm font-medium sm:text-right">
                  Image
                </Label>
                <Input 
                  type="file" 
                  id="edit-image" 
                  name="image" 
                  accept="image/*" 
                  onChange={handleEditImageChange} 
                  className="sm:col-span-3" 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditCrop(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateCrop} className="flex-1">
                Update Crop
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Farmers;
