import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api";

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => getNotifications().then((data) => {
      if (Array.isArray(data)) setNotifications(data);
    }).catch((error) => console.error("[notifications] load failed", error));
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeWhenOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!bellRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((items) => items.map((item) => ({ ...item, read_at: new Date().toISOString() })));
  };

  const selectNotification = async (notification: any) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
      setNotifications((items) => items.map((item) => item.id === notification.id
        ? { ...item, read_at: new Date().toISOString() }
        : item));
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div ref={bellRef} className="relative">
      <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setOpen((value) => !value)}>
        <Bell className="h-5 w-5" />
        {notifications.some((notification) => !notification.read_at) && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </Button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed top-16 z-[100] max-h-[calc(100vh-5rem)] overflow-hidden rounded-lg border bg-white shadow-xl"
          style={{
            right: "1rem",
            width: "min(24rem, calc(100vw - 2rem))",
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">Notifications</span>
            <button className="text-xs text-primary" onClick={markAllRead}>Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                className={`block w-full border-b px-4 py-3 text-left hover:bg-muted ${notification.read_at ? "" : "bg-primary/5"}`}
                onClick={() => selectNotification(notification)}
              >
                <div className="break-words text-sm font-medium">{notification.title}</div>
                <div className="mt-1 break-words text-xs text-muted-foreground">{notification.message}</div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
