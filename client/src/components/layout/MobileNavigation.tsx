import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Columns, CheckSquare, Calendar, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MobileNavigationProps {
  onAddTask?: () => void;
}

export function MobileNavigation({ onAddTask }: MobileNavigationProps) {
  const [location] = useLocation();
  const path = location.split('/')[1];
  const { toast } = useToast();
  
  const handleComingSoon = () => {
    toast({
      title: "Coming Soon",
      description: "This feature will be available in a future update.",
    });
  };
  
  return (
    <nav className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-10">
      <div className="flex justify-around">
        <Link href="/">
          <a className={cn(
            "flex flex-col items-center py-2 px-4",
            path === "" ? "text-primary" : "text-gray-500 dark:text-gray-400"
          )}>
            <Columns className="h-5 w-5" />
            <span className="text-xs mt-1">Boards</span>
          </a>
        </Link>
        
        <Link href="/my-tasks">
          <a className={cn(
            "flex flex-col items-center py-2 px-4",
            path === "my-tasks" ? "text-primary" : "text-gray-500 dark:text-gray-400"
          )}>
            <CheckSquare className="h-5 w-5" />
            <span className="text-xs mt-1">My Tasks</span>
          </a>
        </Link>
        
        <div className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400">
          <Button 
            className="bg-primary rounded-full h-12 w-12 flex items-center justify-center -mt-6 shadow-lg p-0"
            onClick={onAddTask}
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
          <span className="text-xs mt-4">Add</span>
        </div>
        
        <Link href="/calendar">
          <a className={cn(
            "flex flex-col items-center py-2 px-4",
            path === "calendar" ? "text-primary" : "text-gray-500 dark:text-gray-400"
          )}>
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Calendar</span>
          </a>
        </Link>
        
        <button 
          onClick={handleComingSoon}
          className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400 bg-transparent border-0"
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
}
