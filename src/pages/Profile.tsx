import { useEffect, useState } from "react";
import { getProfile, updateProfile, changePassword } from "../api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "", bio: "", email: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    getProfile().then((profile) => {
      setUser(profile);
      setForm({
        name: profile.name || "",
        location: profile.location || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        email: profile.email || ""
      });
      setAvatarPreview(profile.avatar ? (profile.avatar.startsWith('http') ? profile.avatar : `http://localhost:4000${profile.avatar}`) : null);
      setPendingEmail(profile.pending_email || "");
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("location", form.location);
    formData.append("phone", form.phone);
    formData.append("bio", form.bio);
    formData.append("email", form.email);
    if (avatarFile) formData.append("avatar", avatarFile);
    const result = await updateProfile(formData);
    if (!result.error) {
      setUser({ ...user, ...form, avatar: result.avatar || user.avatar });
      setEditMode(false);
      setAvatarFile(null);
      setEmailMsg(result.message?.includes('Verification link') ? result.message : "");
      toast.success(result.message || "Profile updated");
    } else {
      toast.error(result.error);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg("");
    if (passwords.new !== passwords.confirm) {
      setPasswordMsg("New passwords do not match.");
      toast.error("New passwords do not match.");
      return;
    }
    const result = await changePassword(passwords.current, passwords.new);
    if (result.error) {
      setPasswordMsg(result.error);
      toast.error(result.error);
    } else {
      setPasswordMsg("Password updated successfully.");
      setShowPasswordForm(false);
      setPasswords({ current: "", new: "", confirm: "" });
      toast.success("Password updated successfully.");
    }
  };

  const handleResendVerification = async () => {
    setForm(f => ({ ...f, email: pendingEmail }));
    await handleSave();
    toast.success("Verification link resent.");
  };

  if (!user) return <div className="p-4 sm:p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">My Profile</h1>
      
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
        <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
          {avatarPreview ? (
            <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            <AvatarFallback className="text-lg sm:text-xl">
              {user.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2) : "U"}
            </AvatarFallback>
          )}
        </Avatar>
        {editMode && (
          <div className="w-full sm:w-auto">
            <Input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarChange}
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>

      {/* Profile Fields */}
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          {editMode ? (
            <Input name="name" value={form.name} onChange={handleChange} />
          ) : (
            <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md">{user.name}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          {editMode ? (
            <Input name="email" value={form.email} onChange={handleChange} disabled={!!pendingEmail} />
          ) : (
            <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md">{user.email}</div>
          )}
          {pendingEmail && (
            <div className="text-sm mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-blue-800 mb-2">Verification pending for: {pendingEmail}</div>
              <Button size="sm" variant="outline" onClick={handleResendVerification}>Resend Verification</Button>
            </div>
          )}
          {emailMsg && <div className="text-sm mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">{emailMsg}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md capitalize">{user.role}</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          {editMode ? (
            <Input name="location" value={form.location} onChange={handleChange} />
          ) : (
            <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md">{user.location || "Not specified"}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          {editMode ? (
            <Input name="phone" value={form.phone} onChange={handleChange} />
          ) : (
            <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md">{user.phone || "Not specified"}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          {editMode ? (
            <Input name="bio" value={form.bio} onChange={handleChange} />
          ) : (
            <div className="text-base sm:text-lg p-3 bg-muted/50 rounded-md min-h-[3rem]">{user.bio || "No bio added yet"}</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 sm:mt-8">
        {editMode ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} className="flex-1">Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditMode(false)} className="flex-1">Cancel</Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)} className="w-full sm:w-auto">Edit Profile</Button>
        )}
      </div>

      {/* Password Change Section */}
      <div className="mt-8 sm:mt-12 pt-6 border-t">
        <Button 
          variant="secondary" 
          onClick={() => setShowPasswordForm((v) => !v)}
          className="w-full sm:w-auto"
        >
          {showPasswordForm ? "Cancel Password Change" : "Change Password"}
        </Button>
        
        {showPasswordForm && (
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
            <Input 
              type="password" 
              name="current" 
              placeholder="Current Password" 
              value={passwords.current} 
              onChange={handlePasswordChange} 
              required 
            />
            <Input 
              type="password" 
              name="new" 
              placeholder="New Password" 
              value={passwords.new} 
              onChange={handlePasswordChange} 
              required 
            />
            <Input 
              type="password" 
              name="confirm" 
              placeholder="Confirm New Password" 
              value={passwords.confirm} 
              onChange={handlePasswordChange} 
              required 
            />
            <Button type="submit" className="w-full sm:w-auto">Update Password</Button>
            {passwordMsg && (
              <div className={`text-sm mt-2 p-3 rounded-md ${
                passwordMsg.includes('success') 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {passwordMsg}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile; 