import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Download, PlusCircle, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { saveAs } from "file-saver";
import ical from "ical-generator";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getBoardsWithTasks, Task as FirestoreTask } from "@/lib/firestore";

import { useAuth } from "@/providers/auth-provider";

// Extended Task interface with boardName
interface Task extends FirestoreTask {
  boardName?: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Get all tasks with due dates for the user's boards
  const { data: tasksWithDueDates, isLoading } = useQuery({
    queryKey: ['calendar-tasks', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const results = await getBoardsWithTasks(user.uid);
      
      // Filter out tasks without due dates and flatten the array
      const tasks: Task[] = [];
      
      results.forEach(board => {
        board.tasks.forEach(task => {
          if (task.dueDate) {
            tasks.push({
              ...task,
              boardName: board.name 
            });
          }
        });
      });
      
      // Sort by due date (ascending)
      return tasks.sort((a, b) => {
        const dateA = a.dueDate ? a.dueDate.toDate().getTime() : 0;
        const dateB = b.dueDate ? b.dueDate.toDate().getTime() : 0;
        return dateA - dateB;
      });
    },
    enabled: !!user,
  });
  
  // Get days in current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  // Group tasks by date
  const tasksByDate: Record<string, Task[]> = {};
  
  if (tasksWithDueDates) {
    tasksWithDueDates.forEach(task => {
      if (task.dueDate) {
        const date = format(task.dueDate.toDate(), 'yyyy-MM-dd');
        if (!tasksByDate[date]) {
          tasksByDate[date] = [];
        }
        tasksByDate[date].push(task);
      }
    });
  }
  
  // Get tasks for selected date
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const tasksForSelectedDate = tasksByDate[selectedDateKey] || [];
  
  // Generate iCalendar file
  const generateCalendarFile = () => {
    if (!tasksWithDueDates || tasksWithDueDates.length === 0) {
      toast({
        title: "No tasks with due dates",
        description: "Add due dates to your tasks first",
        variant: "destructive",
      });
      return;
    }
    
    const calendar = ical({ name: 'Kanban Tasks' });
    
    tasksWithDueDates.forEach(task => {
      if (task.dueDate) {
        calendar.createEvent({
          start: task.dueDate.toDate(),
          end: task.dueDate.toDate(),
          summary: task.title,
          description: task.description || '',
          location: `Board: ${task.boardName}`
        });
      }
    });
    
    const blob = new Blob([calendar.toString()], { type: 'text/calendar' });
    saveAs(blob, 'kanban-tasks.ics');
    
    toast({
      title: "Calendar exported",
      description: "You can now import this file into your calendar app",
    });
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar} 
          title="Calendar"
          icon={<CalendarIcon className="h-4 w-4 text-white" />}
        />
        
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-6xl mx-auto">
            {/* Top Controls */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Calendar View</h1>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(currentMonth, 'MMMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCurrentMonth(date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button 
                  variant="outline" 
                  onClick={generateCalendarFile}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Calendar
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calendar View */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center font-medium py-2">
                          {day}
                        </div>
                      ))}
                      
                      {/* Empty cells for days before the first of the month */}
                      {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
                        <div key={`empty-${index}`} className="h-16 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50"></div>
                      ))}
                      
                      {/* Calendar days */}
                      {daysInMonth.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const hasTasksForDay = !!tasksByDate[dateKey];
                        const isSelected = isSameDay(day, selectedDate);
                        
                        return (
                          <div
                            key={dateKey}
                            className={`h-16 border rounded-md p-1 cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                            onClick={() => setSelectedDate(day)}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`${isSelected ? 'text-primary' : ''}`}>
                                {format(day, 'd')}
                              </span>
                              {hasTasksForDay && (
                                <Badge variant="secondary" className="text-xs">
                                  {tasksByDate[dateKey].length}
                                </Badge>
                              )}
                            </div>
                            {hasTasksForDay && (
                              <div className="mt-1 overflow-hidden">
                                {tasksByDate[dateKey].slice(0, 1).map((task) => (
                                  <div key={task.id} className="text-xs truncate">
                                    {task.title}
                                  </div>
                                ))}
                                {tasksByDate[dateKey].length > 1 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    +{tasksByDate[dateKey].length - 1} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Tasks for selected day */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold">
                        Tasks due on {format(selectedDate, 'MMMM d, yyyy')}
                      </h2>
                    </div>
                    
                    {tasksForSelectedDate.length > 0 ? (
                      <div className="space-y-3">
                        {tasksForSelectedDate.map((task) => (
                          <Card key={task.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{task.title}</h3>
                                  {task.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {task.boardName}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No tasks due on this day</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Select a different day or add due dates to your tasks
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}