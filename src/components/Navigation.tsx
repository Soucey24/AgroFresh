import { useState, useEffect, useRef } from "react";
import { Menu, X, Leaf, User, LogOut, Bell } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getNotifications, getProfile, logout, markAllNotificationsRead, markNotificationRead } from '../api';

const PROFILE_CACHE_KEY = 'agrofresh_profile_cache';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(undefined);
  const [authReady, setAuthReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const applyProfile = (profile) => {
    console.log('[nav] applyProfile', { path: location.pathname, profile });
    if (profile && !profile.error) {
      setUser(profile);
      sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      setUser(null);
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
    }
  };

  // Check for logged-in user on mount
  useEffect(() => {
    console.log('[nav] auth effect start', { path: location.pathname });
    setAuthReady(false);

    const cachedProfile = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        console.log('[nav] using cached profile', parsed);
        setUser(parsed);
        setAuthReady(true);
      } catch (error) {
        console.warn('[nav] bad cached profile', error);
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
      }
    }

    getProfile()
      .then(profile => {
        console.log('[nav] getProfile resolved', { path: location.pathname, profile });
        applyProfile(profile);
      })
      .catch((error) => {
        console.error('[nav] getProfile failed', { path: location.pathname, error });
        setUser(null);
      })
      .finally(() => {
        console.log('[nav] auth effect finish', { path: location.pathname, userState: user });
        setAuthReady(true);
      });
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const loadNotifications = () => getNotifications().then((data) => {
      if (Array.isArray(data)) setNotifications(data);
    }).catch((error) => console.error('[notifications] load failed', error));
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    console.log('[nav] logout clicked');
    await logout();
    setDropdownOpen(false);
    setUser(null);
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    setIsOpen(false);
    navigate("/");
  };

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">AgroFresh GH</span>
          </Link>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!authReady ? (
              <div className="h-9 w-28 animate-pulse rounded-md bg-muted/60" />
            ) : (
              <>
                {user && (
                  <div className="relative" ref={dropdownRef}>
                    <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setNotificationOpen((open) => !open)}>
                      <Bell className="h-5 w-5" />
                      {notifications.some((notification) => !notification.read_at) && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </Button>
                    {notificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border bg-white shadow-lg z-50">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <span className="font-semibold">Notifications</span>
                          <button className="text-xs text-primary" onClick={() => { markAllNotificationsRead(); setNotifications((items) => items.map((item) => ({ ...item, read_at: new Date().toISOString() }))); }}>Mark all read</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p> : notifications.map((notification) => (
                            <button key={notification.id} className={`block w-full border-b px-4 py-3 text-left hover:bg-muted ${notification.read_at ? '' : 'bg-primary/5'}`} onClick={() => { if (!notification.read_at) { markNotificationRead(notification.id); setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)); } if (notification.link) navigate(notification.link); setNotificationOpen(false); }}>
                              <div className="text-sm font-medium">{notification.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{notification.message}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {user && user.role === 'buyer' && (
                  <Button variant="ghost" asChild>
                    <Link to="/buyer-orders">My Orders</Link>
                  </Button>
                )}
                {user && user.role === 'farmer' && (
                  <Button variant="ghost" asChild>
                    <Link to="/farmer-orders">Orders for My Crops</Link>
                  </Button>
                )}
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <div
                      className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1 transition-colors"
                      onClick={() => setDropdownOpen((open) => !open)}
                    >
                      <Avatar className="w-8 h-8">
                        {user.avatar ? (
                          <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:4000${user.avatar}`} alt={user.name} />
                        ) : (
                          <AvatarFallback className="text-sm">
                            {user.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2) : "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-medium text-foreground hidden sm:block">{user.name}</span>
                    </div>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User className="w-4 h-4 mr-3" />
                          View Profile
                        </Link>
                        <button
                          className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3">
              {!authReady ? (
                <div className="h-12 w-full animate-pulse rounded-md bg-muted/60" />
              ) : (
                <>
                  {user && user.role === 'buyer' && (
                    <Button variant="ghost" className="justify-start h-12" asChild>
                      <Link to="/buyer-orders" onClick={() => setIsOpen(false)}>My Orders</Link>
                    </Button>
                  )}
                  {user && user.role === 'farmer' && (
                    <Button variant="ghost" className="justify-start h-12" asChild>
                      <Link to="/farmer-orders" onClick={() => setIsOpen(false)}>Orders for My Crops</Link>
                    </Button>
                  )}
                  {user ? (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar className="w-10 h-10">
                          {user.avatar ? (
                            <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:4000${user.avatar}`} alt={user.name} />
                          ) : (
                            <AvatarFallback>
                              {user.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2) : "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button variant="ghost" className="justify-start h-12" asChild>
                          <Link to="/profile" onClick={() => setIsOpen(false)}>
                            <User className="w-4 h-4 mr-3" />
                            View Profile
                          </Link>
                        </Button>
                        <Button variant="ghost" className="justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 mr-3" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3 pt-3 border-t border-border">
                      <Button variant="ghost" className="justify-start h-12" asChild>
                        <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                      </Button>
                      <Button className="justify-start h-12" asChild>
                        <Link to="/register" onClick={() => setIsOpen(false)}>Get Started</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
