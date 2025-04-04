import { useRef, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { Board, Column, Task } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskModal } from "../modals/TaskModal";
import { useBoard } from "@/hooks/use-board";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search, Settings, UserPlus, Users } from "lucide-react";
import { InviteModal } from "../modals/InviteModal";
import { BoardModal } from "../modals/BoardModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface KanbanBoardProps {
  boardId: number;
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const { boardData, isLoading, error, moveTask, createColumn } = useBoard();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setStatusPriority] = useState("");
  
  // Filter tasks based on search and filters
  const filteredTasks = boardData?.tasks.filter(task => {
    // Search filter
    const matchesSearch = searchTerm 
      ? task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      : true;
    
    // Status filter
    const matchesStatus = statusFilter === "all" || !statusFilter
      ? true 
      : boardData.columns.find(col => col.id === task.columnId)?.id.toString() === statusFilter;
    
    // Priority filter
    const matchesPriority = priorityFilter === "all" || !priorityFilter
      ? true
      : task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];
  
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // If there's no destination or if the item was dropped back in the same place
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }
    
    const sourceColumnId = parseInt(source.droppableId);
    const destinationColumnId = parseInt(destination.droppableId);
    const taskId = parseInt(draggableId);
    
    // Calculate new order
    const task = boardData?.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const destinationTasks = boardData?.tasks
      .filter(t => t.columnId === destinationColumnId)
      .sort((a, b) => a.order - b.order) || [];
    
    // Calculate the new order
    let newOrder: number;
    
    if (destinationTasks.length === 0) {
      // If the column is empty, start with order 0
      newOrder = 0;
    } else if (destination.index === 0) {
      // If the task is dropped at the beginning
      newOrder = destinationTasks[0].order / 2;
    } else if (destination.index >= destinationTasks.length) {
      // If the task is dropped at the end
      newOrder = destinationTasks[destinationTasks.length - 1].order + 1;
    } else {
      // If the task is dropped in the middle
      const prevTask = destinationTasks[destination.index - 1];
      const nextTask = destinationTasks[destination.index];
      newOrder = (prevTask.order + nextTask.order) / 2;
    }
    
    // Update the task's column and order
    moveTask(taskId, destinationColumnId, newOrder);
  };
  
  const openTaskModal = (task: Task | null = null, columnId: number | null = null) => {
    setSelectedTask(task);
    setSelectedColumnId(columnId);
    setShowTaskModal(true);
  };
  
  const closeTaskModal = () => {
    setSelectedTask(null);
    setSelectedColumnId(null);
    setShowTaskModal(false);
  };
  
  const openInviteModal = () => {
    setShowInviteModal(true);
  };
  
  const closeInviteModal = () => {
    setShowInviteModal(false);
  };
  
  const openBoardModal = () => {
    setShowBoardModal(true);
  };
  
  const closeBoardModal = () => {
    setShowBoardModal(false);
  };
  
  const handleAddColumn = async () => {
    const name = prompt("Enter column name:");
    if (!name) return;
    
    const colors = ["blue", "yellow", "green", "purple", "pink", "indigo"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    await createColumn(name, randomColor);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 mb-2">Error loading board</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {error.message || "There was an error loading the board. Please try again."}
        </p>
      </div>
    );
  }
  
  if (!boardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 mb-2">Board not found</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The requested board could not be found.
        </p>
      </div>
    );
  }
  
  // Sort columns by order
  const sortedColumns = [...boardData.columns].sort((a, b) => a.order - b.order);
  
  // Count tasks
  const totalTasks = boardData.tasks.length;
  const completedTasks = boardData.tasks.filter(task => {
    const column = boardData.columns.find(c => c.id === task.columnId);
    return column?.name.toLowerCase() === "done";
  }).length;
  
  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Board header with actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{boardData.board.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalTasks} tasks · {completedTasks} completed
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Board members/collaborators */}
          <div className="flex -space-x-2 mr-2">
            {boardData.members.slice(0, 3).map((member) => (
              <Avatar key={member.userId} className="h-8 w-8 border-2 border-white dark:border-gray-800">
                <AvatarImage src={member.user?.avatar || undefined} alt={member.user?.username || 'User'} />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {member.user?.username ? member.user.username.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            ))}
            
            {boardData.members.length > 3 && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-white dark:border-gray-800 text-xs font-medium">
                +{boardData.members.length - 3}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={openInviteModal}
            className="hidden sm:flex items-center"
          >
            <UserPlus className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            Invite
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={openBoardModal}
          >
            <Settings className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          
          <Button
            size="sm"
            onClick={() => openTaskModal(null, sortedColumns[0]?.id)}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>
      
      {/* Filter/search row */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm"
          />
          <Search className="h-4 w-4 absolute left-3 top-2 text-gray-400" />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {sortedColumns.map((column) => (
                <SelectItem key={column.id} value={column.id.toString()}>
                  {column.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setStatusPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Main board area */}
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full p-4 space-x-4 min-w-[768px]">
            {sortedColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={filteredTasks.filter(task => task.columnId === column.id)}
                onAddTask={() => openTaskModal(null, column.id)}
                onEditTask={(task) => openTaskModal(task, task.columnId)}
              />
            ))}
            
            {/* Add Column button */}
            <div className="flex items-center justify-center w-72 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <Button 
                variant="ghost" 
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 p-4 flex flex-col items-center"
                onClick={handleAddColumn}
              >
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Column</span>
              </Button>
            </div>
          </div>
        </DragDropContext>
      </div>
      
      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          columnId={selectedColumnId}
          onClose={closeTaskModal}
          columns={boardData.columns}
          members={boardData.members}
        />
      )}
      
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal onClose={closeInviteModal} />
      )}
      
      {/* Board Settings Modal */}
      {showBoardModal && (
        <BoardModal board={boardData.board} onClose={closeBoardModal} />
      )}
    </div>
  );
}
