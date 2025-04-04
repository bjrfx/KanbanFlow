import { Task } from "@/types";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Calendar, Flag, CalendarCheck } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBoard } from "@/hooks/use-board";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { deleteTask } = useBoard();
  
  // Format due date if it exists
  const formattedDueDate = task.dueDate ? new Date(task.dueDate) : null;
  
  // Determine if task is past due
  const isPastDue = formattedDueDate && isPast(formattedDueDate) && !isToday(formattedDueDate);
  
  // Priority icon and color
  const priorityConfig = {
    high: { icon: <Flag className="mr-1 h-3 w-3" />, class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    medium: { icon: <Flag className="mr-1 h-3 w-3" />, class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
    low: { icon: <Flag className="mr-1 h-3 w-3" />, class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the task modal
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(task.id);
    }
  };
  
  return (
    <div 
      className={cn(
        "task-card bg-white dark:bg-gray-700 rounded-md shadow p-3 mb-2 cursor-grab",
        `priority-${task.priority}`,
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
        <div className="flex">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            priorityConfig[task.priority].class
          )}>
            {priorityConfig[task.priority].icon}
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
          {formattedDueDate ? (
            <>
              {isPastDue ? (
                <Calendar className="mr-1 h-3 w-3 text-red-500" />
              ) : (
                <Calendar className="mr-1 h-3 w-3" />
              )}
              <span className={cn(isPastDue && "text-red-500")}>
                Due {format(formattedDueDate, "MMM d")}
              </span>
            </>
          ) : null}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              Assign
            </DropdownMenuItem>
            <DropdownMenuItem>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600" 
              onClick={handleDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
