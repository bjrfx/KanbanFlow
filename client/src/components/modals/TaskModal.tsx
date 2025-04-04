import { useEffect, useState } from "react";
import { useBoard } from "@/hooks/use-board";
import { Column, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BoardMember } from "@/types";
import { cn } from "@/lib/utils";

interface TaskModalProps {
  task: Task | null;
  columnId: number | null;
  onClose: () => void;
  columns: Column[];
  members: BoardMember[];
}

export function TaskModal({ task, columnId, onClose, columns, members }: TaskModalProps) {
  const { createTask, updateTask } = useBoard();
  
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(columnId || task?.columnId || null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority || "medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate ? new Date(task.dueDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditing = !!task;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !selectedColumnId) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        // Update existing task
        await updateTask(task.id, {
          title,
          description,
          columnId: selectedColumnId,
          priority,
          dueDate: dueDate?.toISOString(),
        });
      } else {
        // Create new task
        await createTask({
          title,
          description,
          columnId: selectedColumnId,
          priority,
          dueDate: dueDate?.toISOString(),
        });
      }
      
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? "Edit Task" : "Create New Task"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title
              </Label>
              <Input
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </Label>
              <Textarea
                id="taskDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="taskStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </Label>
                <Select
                  value={selectedColumnId?.toString() || ""}
                  onValueChange={(value) => setSelectedColumnId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id.toString()}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="taskPriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="taskDueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>No due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign To
              </Label>
              <div className="flex items-center space-x-2">
                {members.slice(0, 5).map((member) => (
                  <Avatar 
                    key={member.userId} 
                    className="h-7 w-7 border border-gray-300 dark:border-gray-600"
                  >
                    <AvatarImage src={member.user.avatar} alt={member.user.username} />
                    <AvatarFallback className="text-xs">
                      {member.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                
                <Button 
                  variant="outline"
                  size="sm" 
                  className="h-7 w-7 rounded-full p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  isEditing ? "Update Task" : "Create Task"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
