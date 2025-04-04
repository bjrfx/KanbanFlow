import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Columns, CheckSquare, Calendar, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  onAddTask?: () => void;
}

export function MobileNavigation({ onAddTask }: MobileNavigationProps) {
  const [location] = useLocation();
  const path = location.split('/')[1];
  
  return (
    <nav className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-10">
      <div className="flex justify-around">
        <Link href="/">
          <a className={cn(
            "flex flex-col items-center py-2 px-4",
            path === "" ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
          )}>
            <Columns className="text-lg h-5 w-5" />
            <span className="text-xs mt-1">Boards</span>
          </a>
        </Link>
        
        <a href="#" className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400">
          <CheckSquare className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">My Tasks</span>
        </a>
        
        <div className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400">
          <Button 
            className="bg-primary rounded-full h-10 w-10 flex items-center justify-center -mt-5 shadow-lg p-0"
            onClick={onAddTask}
          >
            <Plus className="h-5 w-5 text-white" />
          </Button>
          <span className="text-xs mt-3">Add</span>
        </div>
        
        <a href="#" className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400">
          <Calendar className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Calendar</span>
        </a>
        
        <a href="#" className="flex flex-col items-center py-2 px-4 text-gray-500 dark:text-gray-400">
          <User className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Profile</span>
        </a>
      </div>
    </nav>
  );
}
