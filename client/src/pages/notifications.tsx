import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Notification } from "@/components/ui/notification-dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Timestamp } from "firebase/firestore";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  listenForUserNotifications,
  createNotification
} from "@/lib/firestore";

export default function Notifications() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Fetch notifications and set up real-time listener  
  useEffect(() => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    
    let unsubscribeFunction: (() => void) | undefined;
    
    try {
      // Set up real-time listener for notifications
      unsubscribeFunction = listenForUserNotifications(user.uid, (fetchedNotifications) => {
        console.log("Notifications updated:", fetchedNotifications);
        setNotifications(fetchedNotifications);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Error setting up notifications listener:", error);
      setIsLoading(false);
    }
    
    // Cleanup listener on unmount
    return () => {
      try {
        if (unsubscribeFunction) {
          unsubscribeFunction();
        }
      } catch (error) {
        console.error("Error unsubscribing from notifications:", error);
      }
    };
  }, [user]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
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
      navigate(notification.linkTo);
    }
  };
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.read;
    return n.type === activeTab;
  });
  
  // Helper to convert Firestore timestamp to Date
  const toDate = (timestamp: any): Date => {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return new Date(timestamp || 0);
  };
  
  // Format date for grouping
  const formatDate = (timestamp: any) => {
    const date = toDate(timestamp);
    
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "EEEE, MMMM d, yyyy");
    }
  };
  
  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = formatDate(notification.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);
  
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar}
          title="Notifications"
          icon={<Bell className="h-4 w-4 text-white" />}
        />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Stay updated on tasks, mentions, and important updates
                </p>
              </div>
              
              <div className="flex gap-2">
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      if (!user?.uid) return;
                      
                      try {
                        await createNotification({
                          userId: user.uid,
                          title: "Test notification",
                          message: "This is a test notification created at " + new Date().toLocaleTimeString(),
                          read: false,
                          type: "system"
                        });
                      } catch (error) {
                        console.error("Error creating test notification:", error);
                      }
                    }}
                  >
                    Test
                  </Button>
                )}
                
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid grid-cols-5 w-full sm:w-auto">
                <TabsTrigger value="all" className="relative">
                  All
                  {unreadCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="task">Tasks</TabsTrigger>
                <TabsTrigger value="mention">Mentions</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                      No notifications
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {activeTab === "all" ? 
                        "You don't have any notifications yet." : 
                        `You don't have any ${activeTab === "unread" ? "unread" : activeTab} notifications.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedNotifications).map(([date, items]) => (
                      <div key={date}>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          {date}
                        </h3>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                          {items.map((notification, index) => (
                            <div 
                              key={notification.id}
                              className={cn(
                                "p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                                !notification.read && "bg-primary-50 dark:bg-primary-900/20",
                                index !== items.length - 1 && "border-b border-gray-200 dark:border-gray-700"
                              )}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex">
                                <div className={cn("shrink-0 w-2 h-2 mt-2 mr-3 rounded-full", getIconColor(notification.type))}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      !notification.read ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-gray-100"
                                    )}>
                                      {notification.title}
                                    </p>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                      {format(toDate(notification.timestamp), 'h:mm a')}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    {notification.message}
                                  </p>
                                  {notification.linkTo && (
                                    <div className="mt-2">
                                      <Button 
                                        variant="link" 
                                        className="h-auto p-0 text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleNotificationClick(notification);
                                        }}
                                      >
                                        View details →
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-6 w-6 text-primary"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await markNotificationAsRead(notification.id);
                                        // Update is handled by the real-time listener
                                      } catch (error) {
                                        console.error("Error marking notification as read:", error);
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="sr-only">Mark as read</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        {/* Mobile navigation */}
        <MobileNavigation />
      </div>
    </div>
  );
}