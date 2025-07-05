import { useState, useEffect } from "react";
import { Search, Filter, MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listUsers, createUser, updateUser, deleteUser } from "@/api";

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "Farmer", location: "", password: "" });
  const [editForm, setEditForm] = useState({ id: null, name: "", email: "", role: "Farmer", location: "", status: "Active" });
  const [filter, setFilter] = useState({ role: "", status: "", location: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    farmers: 0,
    buyers: 0,
    activeUsers: 0
  });

  const fetchUsers = async () => {
    setLoading(true);
    const data = await listUsers();
    if (!data.error) {
      setUsers(Array.isArray(data) ? data : []);
      
      // Calculate user statistics
      const stats = {
        totalUsers: data.length,
        farmers: data.filter(u => u.role === 'farmer').length,
        buyers: data.filter(u => u.role === 'buyer').length,
        activeUsers: data.filter(u => u.status === 'Active').length
      };
      setUserStats(stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    const result = await createUser(addForm);
    if (!result.error) {
      setIsAddDialogOpen(false);
      setAddForm({ name: "", email: "", role: "Farmer", location: "", password: "" });
      fetchUsers();
    } else {
      alert(result.error);
    }
  };

  const handleEditUser = async () => {
    const { id, ...rest } = editForm;
    const result = await updateUser(id, rest);
    if (!result.error) {
      setIsEditDialogOpen(false);
      setEditForm({ id: null, name: "", email: "", role: "Farmer", location: "", status: "Active" });
      fetchUsers();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const result = await deleteUser(id);
    if (!result.error) {
      fetchUsers();
    } else {
      alert(result.error);
    }
  };

  const filteredUsers = users.filter(user =>
    (filter.role ? user.role === filter.role : true) &&
    (filter.status ? user.status === filter.status : true) &&
    (filter.location ? user.location?.toLowerCase().includes(filter.location.toLowerCase()) : true) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status) => {
    return status === "Active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";
  };

  const getRoleColor = (role) => {
    return role === "Farmer" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage farmers and vendors on your platform</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleAddUser(); }}>
                <div>
                  <label className="block mb-1">Name</label>
                  <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1">Email</label>
                  <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1">Role</label>
                  <select className="w-full border rounded px-2 py-1" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))} required>
                    <option value="Farmer">Farmer</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Location</label>
                  <Input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1">Password</label>
                  <Input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full">Create User</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{userStats.totalUsers}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">{userStats.farmers}</div>
              <p className="text-sm text-muted-foreground">Farmers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">{userStats.buyers}</div>
              <p className="text-sm text-muted-foreground">Buyers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{userStats.activeUsers}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setIsFilterDialogOpen(true)}>
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Users</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); setIsFilterDialogOpen(false); }}>
                <div>
                  <label className="block mb-1">Role</label>
                  <select className="w-full border rounded px-2 py-1" value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
                    <option value="">All</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Status</label>
                  <select className="w-full border rounded px-2 py-1" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                    <option value="">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Location</label>
                  <Input value={filter.location} onChange={e => setFilter(f => ({ ...f, location: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full">Apply Filter</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>A list of all registered users on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div>Loading...</div> : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">{user.location}</p>
                    </div>
                    
                    <div className="text-right">
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                      {user.last_login && (
                        <p className="text-xs text-muted-foreground">Last login: {new Date(user.last_login).toLocaleString()}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          setEditForm({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            location: user.location,
                            status: user.status || "Active"
                          });
                          setIsEditDialogOpen(true);
                        }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditUser(); }}>
              <div>
                <label className="block mb-1">Name</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1">Email</label>
                <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1">Role</label>
                <select className="w-full border rounded px-2 py-1" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} required>
                  <option value="Farmer">Farmer</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Location</label>
                <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1">Status</label>
                <select className="w-full border rounded px-2 py-1" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Users;
