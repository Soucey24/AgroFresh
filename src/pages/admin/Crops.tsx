import { useState } from "react";
import { Search, Filter, Eye, Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";

const Crops = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const crops = [
    {
      id: 1,
      name: "Fresh Tomatoes",
      farmer: "Kwame Asante",
      quantity: "50kg",
      price: "GHS 5/kg",
      status: "Active",
      expiresIn: "3 days",
      location: "Kumasi",
      dateAdded: "2024-06-05"
    },
    {
      id: 2,
      name: "Green Peppers",
      farmer: "Kofi Osei",
      quantity: "30kg",
      price: "GHS 8/kg",
      status: "Active",
      expiresIn: "5 days",
      location: "Tamale",
      dateAdded: "2024-06-06"
    },
    {
      id: 3,
      name: "Sweet Potatoes",
      farmer: "Ama Boateng",
      quantity: "100kg",
      price: "GHS 3/kg",
      status: "Expired",
      expiresIn: "Expired",
      location: "Cape Coast",
      dateAdded: "2024-05-28"
    },
    {
      id: 4,
      name: "Plantains",
      farmer: "Yaw Mensah",
      quantity: "80 pieces",
      price: "GHS 2/piece",
      status: "Active",
      expiresIn: "1 day",
      location: "Accra",
      dateAdded: "2024-06-07"
    }
  ];

  const filteredCrops = crops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-primary text-primary-foreground";
      case "Expired":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getExpirationColor = (expiresIn: string) => {
    if (expiresIn === "Expired") return "text-destructive";
    if (expiresIn.includes("1 day")) return "text-accent";
    return "text-muted-foreground";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Crop Listings</h1>
            <p className="text-muted-foreground">Monitor and manage all crop listings on the platform</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search crops, farmers, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => alert('Filter dialog coming soon!')}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">324</div>
              <p className="text-sm text-muted-foreground">Active Listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">45</div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">89</div>
              <p className="text-sm text-muted-foreground">Sold Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">12</div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>

        {/* Crops Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Crop Listings ({filteredCrops.length})</CardTitle>
            <CardDescription>Manage all crop listings on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCrops.map((crop) => (
                <div key={crop.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🌾</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{crop.name}</h3>
                      <p className="text-sm text-muted-foreground">by {crop.farmer}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="font-medium">{crop.quantity}</p>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium">{crop.price}</p>
                      <p className="text-sm text-muted-foreground">Price</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{crop.location}</p>
                      <Badge className={getStatusColor(crop.status)}>{crop.status}</Badge>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm ${getExpirationColor(crop.expiresIn)}`}>
                          {crop.expiresIn}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{crop.dateAdded}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => alert('View crop details coming soon!')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => alert('Edit crop coming soon!')}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => alert('Delete crop coming soon!')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Crops;
