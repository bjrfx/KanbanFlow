import { Droppable, Draggable } from "react-beautiful-dnd";
import { Column, Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
}

export function KanbanColumn({ column, tasks, onAddTask, onEditTask }: KanbanColumnProps) {
  // Sort tasks by order
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  
  return (
    <div className={cn(
      "flex flex-col w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg",
      `column-color-${column.color}`
    )}>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center">
          <span className="column-header-indicator w-3 h-3 rounded-full mr-2"></span>
          <h3 className="font-medium text-gray-800 dark:text-white">{column.name}</h3>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          onClick={onAddTask}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <Droppable droppableId={column.id.toString()}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 min-h-[200px] p-2 overflow-y-auto column-drop-zone scrollbar-hide",
              snapshot.isDraggingOver && "active"
            )}
          >
            {sortedTasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      snapshot.isDragging && "dragging"
                    )}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onEditTask(task)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
