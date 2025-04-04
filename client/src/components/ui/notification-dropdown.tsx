import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Timestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { 
  Notification as FirestoreNotification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  listenForUserNotifications
} from "@/lib/firestore";

// Use the Firestore notification type
export type Notification = FirestoreNotification;

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  
  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Fetch notifications and set up real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    
    // Set up real-time listener for notifications
    const unsubscribe = listenForUserNotifications(user.uid, (fetchedNotifications) => {
      console.log("Notifications updated:", fetchedNotifications);
      setNotifications(fetchedNotifications);
    });
    
    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [user]);
  
  // Mark a notification as read and navigate to its link if applicable
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        // Update in Firestore
        await markNotificationAsRead(notification.id);
        
        // Update local state (the listener will eventually update, but this is faster)
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    
    // Navigate if there's a link
    if (notification.linkTo) {
      setOpen(false);
      navigate(notification.linkTo);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.uid) return;
    
    try {
      // Update in Firestore
      await markAllNotificationsAsRead(user.uid);
      
      // Update local state (the listener will eventually update, but this is faster)
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };
  
  // Format the notification timestamp
  const formatTimestamp = (timestamp: any) => {
    // Convert Firestore timestamp to Date if needed
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };
  
  // Get icon color based on notification type
  const getIconColor = (type: string) => {
    switch (type) {
      case "task":
        return "text-blue-500";
      case "mention":
        return "text-purple-500";
      case "due":
        return "text-orange-500";
      case "system":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex justify-between items-center p-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-96 overflow-y-auto py-1">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-3 cursor-pointer",
                  !notification.read && "bg-primary-50 dark:bg-primary-900/20"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full">
                  <div className={cn("shrink-0 w-2 h-2 mt-1.5 mr-2 rounded-full", getIconColor(notification.type))}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 w-full">
                      <p className={cn(
                        "text-sm font-medium leading-none mb-1",
                        !notification.read ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-gray-100"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary" onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}>
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}