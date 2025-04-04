import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Loader2, 
  Plus, 
  MoreVertical, 
  Calendar, 
  Clock, 
  Edit, 
  Trash,
  User,
  X,
  Flag
} from "lucide-react";
import { 
  Board as BoardType, 
  Column as ColumnType, 
  Task as TaskType, 
  getBoard, 
  getBoardColumns, 
  getColumnTasks, 
  createTask, 
  updateTask,
  onBoardChange,
  onBoardColumnsChange,
  onColumnTasksChange,
  onBoardTasksChange
} from "@/lib/firestore";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { assignTaskToUser, unassignTaskFromUser } from "@/lib/firestore";

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Task creation states
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  // Task view/edit states
  const [viewingTask, setViewingTask] = useState<TaskType | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  const [editedTaskDescription, setEditedTaskDescription] = useState("");
  
  // Fetch the current board from Firestore
  const { data: board, isLoading: isBoardLoading, isError: isBoardError } = useQuery<BoardType>({
    queryKey: ['board', id],
    queryFn: () => getBoard(id),
    retry: 1,
  });
  
  // Fetch the board columns from Firestore
  const { data: columns, isLoading: isColumnsLoading } = useQuery<ColumnType[]>({
    queryKey: ['columns', id],
    queryFn: () => getBoardColumns(id),
    enabled: !!board,
  });
  
  // Fetch tasks for each column
  const { data: tasksData, isLoading: isTasksLoading } = useQuery<{[columnId: string]: TaskType[]}>({
    queryKey: ['tasks', id],
    queryFn: async () => {
      if (!columns) return {};
      
      const columnTasksMap: {[columnId: string]: TaskType[]} = {};
      
      console.log("Fetching tasks for columns:", columns);
      
      for (const column of columns) {
        console.log("Getting tasks for column:", column.id);
        const tasks = await getColumnTasks(column.id);
        console.log(`Got ${tasks.length} tasks for column ${column.id}:`, tasks);
        columnTasksMap[column.id] = tasks;
      }
      
      console.log("Final columnTasksMap:", columnTasksMap);
      return columnTasksMap;
    },
    enabled: !!columns && columns.length > 0,
  });
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string, title: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      return createTask(user.uid, {
        boardId: id,
        columnId,
        title,
        order: tasksData?.[columnId]?.length || 0,
      });
    },
    onSuccess: (newTask) => {
      console.log("Task created successfully:", newTask);
      
      // Reset form
      setNewTaskTitle("");
      setAddingToColumn(null);
      
      // Force refetch all tasks
      setTimeout(() => {
        // Invalidate tasks query to refetch after a slight delay (this helps with serverTimestamp processing)
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        // Manually update the UI with the new task
        if (tasksData) {
          const columnId = newTask.columnId;
          const updatedTasksData = { ...tasksData };
          
          if (!updatedTasksData[columnId]) {
            updatedTasksData[columnId] = [];
          }
          
          updatedTasksData[columnId] = [...updatedTasksData[columnId], newTask];
          queryClient.setQueryData(['tasks', id], updatedTasksData);
        }
      }, 500);
      
      // Show success toast
      toast({
        title: "Task created",
        description: "Your new task has been added to the column.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: any }) => {
      return updateTask(taskId, data);
    },
    onSuccess: () => {
      // Reset form and close dialog
      setViewingTask(null);
      setIsEditingTask(false);
      setEditedTaskTitle("");
      setEditedTaskDescription("");
      
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      
      // Show success toast
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating task",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle drag and drop
  const handleDragEnd = async (result: any) => {
    console.log("Drag ended with result:", result);
    const { source, destination, draggableId } = result;
    
    // Dropped outside a droppable area
    if (!destination) {
      console.log("Dropped outside droppable area");
      return;
    }
    
    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId && 
      source.index === destination.index
    ) {
      console.log("Dropped in same position");
      return;
    }
    
    // Get the task and columns
    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;
    const taskId = draggableId;
    
    console.log(`Moving task ${taskId} from column ${sourceColumnId} to ${destColumnId}`);
    console.log(`From index ${source.index} to index ${destination.index}`);
    
    if (!tasksData) {
      console.error("tasksData is not available");
      return;
    }
    
    // Create updated tasks array
    const newTasksData = {...tasksData};
    
    // Make sure the source column exists in tasksData
    if (!newTasksData[sourceColumnId]) {
      console.error(`Source column ${sourceColumnId} not found in tasksData`);
      return;
    }
    
    // Make sure the destination column exists in tasksData
    if (!newTasksData[destColumnId]) {
      console.error(`Destination column ${destColumnId} not found in tasksData`);
      // Initialize the destination column if it doesn't exist
      newTasksData[destColumnId] = [];
    }
    
    // Remove from source column
    const sourceTasks = [...newTasksData[sourceColumnId]];
    const [movedTask] = sourceTasks.splice(source.index, 1);
    if (!movedTask) {
      console.error("Task not found at source index");
      return;
    }
    
    newTasksData[sourceColumnId] = sourceTasks;
    
    // Add to destination column
    if (sourceColumnId === destColumnId) {
      // Same column, reorder
      sourceTasks.splice(destination.index, 0, movedTask);
      newTasksData[sourceColumnId] = sourceTasks;
      console.log("Task reordered within same column");
    } else {
      // Different column
      const destTasks = [...(newTasksData[destColumnId] || [])];
      const updatedTask = {...movedTask, columnId: destColumnId};
      destTasks.splice(destination.index, 0, updatedTask);
      newTasksData[destColumnId] = destTasks;
      console.log("Task moved to different column");
    }
    
    // Update the order numbers
    newTasksData[sourceColumnId] = newTasksData[sourceColumnId].map((task, idx) => ({
      ...task,
      order: idx
    }));
    
    if (sourceColumnId !== destColumnId) {
      newTasksData[destColumnId] = newTasksData[destColumnId].map((task, idx) => ({
        ...task,
        order: idx
      }));
    }
    
    console.log("New tasksData:", newTasksData);
    
    // Optimistically update the UI
    queryClient.setQueryData(['tasks', id], newTasksData);
    
    // Update in the database
    try {
      console.log(`Updating task ${taskId} in database`);
      await updateTaskMutation.mutateAsync({ 
        taskId,
        data: {
          columnId: destColumnId,
          order: destination.index
        }
      });
      console.log("Task update successful");
      
      // Force a refetch to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    } catch (error: any) {
      console.error("Error updating task position:", error);
      // Revert to original state on error
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      
      toast({
        title: "Error moving task",
        description: error.message || "There was a problem updating the task position. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Handle add task form submission
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addingToColumn || !newTaskTitle.trim()) return;
    
    createTaskMutation.mutate({
      columnId: addingToColumn,
      title: newTaskTitle,
    });
  };
  
  // Handle task edit form submission
  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!viewingTask || !editedTaskTitle.trim()) return;
    
    updateTaskMutation.mutate({
      taskId: viewingTask.id,
      data: {
        title: editedTaskTitle,
        description: editedTaskDescription,
      },
    });
  };
  
  // Prepare task for editing
  const startEditingTask = (task: TaskType) => {
    setEditedTaskTitle(task.title);
    setEditedTaskDescription(task.description || "");
    setIsEditingTask(true);
  };
  
  // Set up real-time listeners for the board, columns, and tasks
  useEffect(() => {
    if (!id || !board) return;
    
    console.log("Setting up real-time listeners for board:", id);
    
    // Set up listeners
    const boardUnsubscribe = onBoardChange(id, (updatedBoard) => {
      console.log("Board updated:", updatedBoard);
      queryClient.setQueryData(['board', id], updatedBoard);
    });
    
    const columnsUnsubscribe = onBoardColumnsChange(id, (updatedColumns) => {
      console.log("Columns updated:", updatedColumns);
      queryClient.setQueryData(['columns', id], updatedColumns);
    });
    
    const tasksUnsubscribe = onBoardTasksChange(id, (allTasks) => {
      console.log("All tasks updated:", allTasks);
      
      // Group tasks by column
      const tasksByColumn: {[columnId: string]: TaskType[]} = {};
      
      // Initialize with all known columns
      if (columns) {
        columns.forEach(column => {
          tasksByColumn[column.id] = [];
        });
      }
      
      // Populate tasks by column
      allTasks.forEach(task => {
        if (!tasksByColumn[task.columnId]) {
          tasksByColumn[task.columnId] = [];
        }
        tasksByColumn[task.columnId].push(task);
      });
      
      // Sort tasks by order within each column
      Object.keys(tasksByColumn).forEach(columnId => {
        tasksByColumn[columnId].sort((a, b) => a.order - b.order);
      });
      
      queryClient.setQueryData(['tasks', id], tasksByColumn);
    });
    
    // Clean up listeners when component unmounts
    return () => {
      console.log("Cleaning up real-time listeners");
      boardUnsubscribe();
      columnsUnsubscribe();
      tasksUnsubscribe();
    };
  }, [id, board, columns]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to go back to main page
      if (e.key === 'Escape' && !viewingTask && !addingToColumn) {
        e.preventDefault();
        navigate("/");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, viewingTask, addingToColumn]);
  
  // Error handling
  if (isBoardError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Board not found</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            The board you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/")}>
            Go back to home
          </Button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isBoardLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Loading board...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar} 
          currentBoardId={id}
          selectedBoard={board}
        />
        
        {/* Board View with DnD */}
        <div className="flex-1 overflow-auto p-4 pb-24 sm:pb-4">
          {isColumnsLoading || isTasksLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex space-x-4 h-full">
                {columns && columns.length > 0 ? (
                  columns.map(column => (
                    <div 
                      key={column.id} 
                      className="w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md shadow-sm flex flex-col"
                    >
                      {/* Column header */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: column.color || '#9CA3AF' }}
                            ></div>
                            <h3 className="font-medium">{column.name}</h3>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {tasksData && tasksData[column.id] ? tasksData[column.id].length : 0}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setAddingToColumn(column.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Tasks */}
                      <Droppable droppableId={column.id}>
                        {(provided) => (
                          <div 
                            className="flex-1 overflow-y-auto p-2"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {/* Add task form */}
                            {addingToColumn === column.id && (
                              <Card className="mb-2">
                                <CardContent className="p-3">
                                  <form onSubmit={handleAddTask}>
                                    <Input
                                      placeholder="Enter task title"
                                      value={newTaskTitle}
                                      onChange={(e) => setNewTaskTitle(e.target.value)}
                                      className="mb-2"
                                      autoFocus
                                    />
                                    <div className="flex justify-end space-x-2">
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setAddingToColumn(null);
                                          setNewTaskTitle("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        type="submit" 
                                        size="sm"
                                        disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                                      >
                                        {createTaskMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : "Add"}
                                      </Button>
                                    </div>
                                  </form>
                                </CardContent>
                              </Card>
                            )}
                            
                            {/* Tasks list */}
                            {tasksData && tasksData[column.id] && tasksData[column.id].length > 0 ? (
                              tasksData[column.id].map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`mb-2 bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm cursor-pointer
                                        ${snapshot.isDragging ? 'opacity-70' : ''}`}
                                      onClick={() => setViewingTask(task)}
                                    >
                                      <div className="flex justify-between items-start">
                                        <h4 className="font-medium text-sm">{task.title}</h4>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                              <MoreVertical className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingTask(task);
                                              startEditingTask(task);
                                            }}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                              className="text-red-500 dark:text-red-400"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toast({
                                                  title: "Coming Soon",
                                                  description: "Task deletion will be available in a future update.",
                                                });
                                              }}
                                            >
                                              <Trash className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {task.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}
                                      {task.updatedAt && (
                                        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 mt-2">
                                          <Clock className="h-3 w-3 mr-1" />
                                          <span>Updated {formatDistanceToNow(task.updatedAt.toDate(), { addSuffix: true })}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            ) : (
                              <div className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
                                {addingToColumn === column.id ? "" : "No tasks yet"}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      
                      {/* Column footer */}
                      {addingToColumn !== column.id && (
                        <div className="p-2">
                          <Button 
                            variant="outline" 
                            className="w-full text-gray-500 dark:text-gray-400 border-dashed"
                            onClick={() => setAddingToColumn(column.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Task
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center w-full">
                    <p className="text-gray-500 dark:text-gray-400">No columns found for this board</p>
                  </div>
                )}
              </div>
            </DragDropContext>
          )}
        </div>
        
        {/* Task dialog */}
        <Dialog open={!!viewingTask} onOpenChange={(open) => {
          if (!open) {
            setViewingTask(null);
            setIsEditingTask(false);
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            {viewingTask && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {isEditingTask ? (
                      "Edit Task"
                    ) : (
                      viewingTask.title
                    )}
                  </DialogTitle>
                  {!isEditingTask && viewingTask.description && (
                    <DialogDescription>
                      {viewingTask.description}
                    </DialogDescription>
                  )}
                </DialogHeader>
                
                {isEditingTask ? (
                  <form onSubmit={handleUpdateTask}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={editedTaskTitle}
                          onChange={(e) => setEditedTaskTitle(e.target.value)}
                          placeholder="Task title"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={editedTaskDescription}
                          onChange={(e) => setEditedTaskDescription(e.target.value)}
                          placeholder="Add a description..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingTask(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={!editedTaskTitle.trim() || updateTaskMutation.isPending}
                      >
                        {updateTaskMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <>
                    <div className="py-4">
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <h4 className="text-sm font-medium">Status</h4>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: columns?.find(col => col.id === viewingTask.columnId)?.color || 'gray' }}
                            ></div>
                            <span className="text-sm">
                              {columns?.find(col => col.id === viewingTask.columnId)?.name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <h4 className="text-sm font-medium">Priority</h4>
                          <div className="flex items-center">
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                              viewingTask.priority === 'high' 
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" 
                                : viewingTask.priority === 'medium'
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            )}>
                              <Flag className="mr-1 h-3 w-3" />
                              {viewingTask.priority ? viewingTask.priority.charAt(0).toUpperCase() + viewingTask.priority.slice(1) : 'Low'}
                            </span>
                          </div>
                        </div>
                        
                        {viewingTask.dueDate && (
                          <div className="flex flex-col space-y-2">
                            <h4 className="text-sm font-medium">Due Date</h4>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span className="text-sm">
                                {format(viewingTask.dueDate.toDate(), "PPP")}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col space-y-2">
                          <h4 className="text-sm font-medium">Assigned To</h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingTask.assignedTo && viewingTask.assignedTo.length > 0 ? (
                              viewingTask.assignedTo.map(userId => (
                                <div 
                                  key={userId}
                                  className="flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs"
                                >
                                  <User className="h-3 w-3 mr-1" />
                                  <span>{userId}</span>
                                  <X 
                                    className="h-3 w-3 ml-1 cursor-pointer text-gray-500 hover:text-red-500"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (user) {
                                        try {
                                          await unassignTaskFromUser(viewingTask.id, userId);
                                          toast({
                                            title: "User unassigned",
                                            description: "User has been unassigned from the task"
                                          });
                                        } catch (error) {
                                          console.error("Error unassigning user:", error);
                                          toast({
                                            title: "Error",
                                            description: "Could not unassign user from task",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                No users assigned
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Assign User
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-60">
                                <div className="space-y-2">
                                  <h3 className="font-medium text-sm">Assign to user</h3>
                                  <Button 
                                    className="w-full justify-start text-left"
                                    variant="outline" 
                                    size="sm"
                                    onClick={async () => {
                                      if (user) {
                                        try {
                                          await assignTaskToUser(viewingTask.id, user.uid, user.uid);
                                          toast({
                                            title: "Task assigned",
                                            description: "Task assigned to you"
                                          });
                                        } catch (error) {
                                          console.error("Error assigning task:", error);
                                          toast({
                                            title: "Error",
                                            description: "Could not assign task",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <User className="h-3 w-3 mr-2" />
                                    Assign to me
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <h4 className="text-sm font-medium">Created</h4>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {viewingTask.createdAt && (
                              <>
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{viewingTask.createdAt.toDate().toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => startEditingTask(viewingTask)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Task
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Mobile navigation */}
        <MobileNavigation onAddTask={() => {
          // Find the first column and set it as the target for adding a task
          if (columns && columns.length > 0) {
            setAddingToColumn(columns[0].id);
          }
        }} />
      </div>
    </div>
  );
}
