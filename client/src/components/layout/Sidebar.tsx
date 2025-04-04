import { Button } from "@/components/ui/button";
import { Columns, Calendar, CheckSquare, UserPlus, Users, Plus, Clipboard, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Board as BoardType, getUserBoards } from "@/lib/firestore";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const currentPath = location.split('/')[1];
  const currentBoardId = location.startsWith('/board/') ? location.split('/')[2] : null;
  
  // Fetch user's boards from Firestore
  const { data: boards, isLoading: isLoadingBoards } = useQuery<BoardType[]>({
    queryKey: ['boards', user?.uid],
    queryFn: () => user ? getUserBoards(user.uid) : Promise.resolve([]),
    enabled: !!user,
  });
  
  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Set the CSS classes for the sidebar based on whether it's open or not
  const sidebarClasses = cn(
    "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col",
    isMobile ? (
      isOpen ? 
        "fixed inset-y-0 left-0 w-64 z-40 shadow-xl animate-in slide-in-from-left duration-300" : 
        "hidden"
    ) : "w-64"
  );
  
  // If the sidebar is shown on mobile, add an overlay
  const overlayClasses = cn(
    "fixed inset-0 bg-gray-900/50 z-30",
    isMobile && isOpen ? "block" : "hidden"
  );
  
  // Handle "Coming soon" feature clicks
  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon",
      description: `The ${feature} feature will be available in a future update.`,
    });
  };
  
  return (
    <>
      {/* Overlay for mobile */}
      <div className={overlayClasses} onClick={onClose} />
      
      <aside className={sidebarClasses}>
        {isMobile && (
          <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary rounded flex items-center justify-center mr-2">
                <Columns className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Kanban</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <span className="sr-only">Close sidebar</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>
        )}
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Main</h2>
            <div className="mt-2 space-y-1">
              <Link href="/">
                <a className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  currentPath === "" ? 
                    "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400" : 
                    "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}>
                  <Columns className={cn(
                    "mr-3 h-4 w-4",
                    currentPath === "" ? 
                      "text-primary-500" : 
                      "text-gray-400 dark:text-gray-500"
                  )} />
                  Boards
                </a>
              </Link>
              <button 
                onClick={() => handleComingSoon("My Tasks")}
                className="w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <CheckSquare className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                My Tasks
              </button>
              <Link href="/calendar">
                <a className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  currentPath === "calendar" ? 
                    "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400" : 
                    "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )} onClick={() => isMobile && onClose()}>
                  <Calendar className={cn(
                    "mr-3 h-4 w-4",
                    currentPath === "calendar" ? 
                      "text-primary-500" : 
                      "text-gray-400 dark:text-gray-500"
                  )} />
                  Calendar
                </a>
              </Link>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between px-3">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Boards</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                onClick={() => {
                  navigate("/");
                  // Close sidebar on mobile after navigating
                  if (isMobile) onClose();
                  
                  // Small delay to allow navigation to complete
                  setTimeout(() => {
                    // Find the "New Board" button element and click it
                    const newBoardBtn = document.querySelector('[data-new-board-button="true"]');
                    if (newBoardBtn) {
                      (newBoardBtn as HTMLButtonElement).click();
                    }
                  }, 100);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 space-y-1">
              {isLoadingBoards ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                boards && boards.length > 0 ? (
                  boards.map((board) => (
                    <Link key={board.id} href={`/board/${board.id}`}>
                      <a 
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                          currentBoardId === board.id ? 
                            "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400" : 
                            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                        onClick={() => isMobile && onClose()}
                      >
                        <Clipboard className={cn(
                          "mr-3 h-4 w-4",
                          currentBoardId === board.id ? 
                            "text-primary-500" : 
                            "text-gray-400 dark:text-gray-500"
                        )} />
                        {board.name}
                      </a>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No boards yet
                  </div>
                )
              )}
            </div>
          </div>
          
          <div>
            <h2 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</h2>
            <div className="mt-2 space-y-1">
              <button 
                onClick={() => handleComingSoon("Team Members")}
                className="w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Users className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                Team Members
              </button>
              <button 
                onClick={() => handleComingSoon("Invite People")}
                className="w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <UserPlus className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                Invite People
              </button>
            </div>
          </div>
        </nav>
        
        {/* Offline indicator/sync status */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <span className={cn(
              "h-2 w-2 rounded-full mr-2",
              navigator.onLine ? "bg-green-500" : "bg-yellow-500"
            )}></span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {navigator.onLine 
                ? "Online - All changes saved" 
                : "Offline - Changes will sync when online"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
