import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  Clipboard, 
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Task, getUserAssignedTasks } from "@/lib/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyTasks() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's assigned tasks
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['my-tasks', user?.uid],
    queryFn: () => user ? getUserAssignedTasks(user.uid) : Promise.resolve([]),
    enabled: !!user,
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks?.filter(task => {
    if (activeTab === "all") return true;
    if (activeTab === "due-soon") {
      // Consider tasks due within the next 3 days as "due soon"
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);
      return dueDate <= threeDaysFromNow && dueDate >= now;
    }
    if (activeTab === "overdue") {
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      const now = new Date();
      return dueDate < now;
    }
    if (activeTab === "no-due-date") {
      return !task.dueDate;
    }
    return true;
  });

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Navigate to the task's board
  const goToTask = (task: Task) => {
    navigate(`/board/${task.boardId}?taskId=${task.id}`);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar}
          title="My Tasks"
          icon={<CheckCircle2 className="h-4 w-4 text-white" />}
        />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Tasks</h1>
              <p className="text-gray-500 dark:text-gray-400">
                View and manage all tasks assigned to you across different boards
              </p>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="due-soon">Due Soon</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="no-due-date">No Due Date</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {filteredTasks && filteredTasks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTasks.map((task) => (
                          <Card 
                            key={task.id} 
                            className="cursor-pointer transition-all hover:shadow-md hover:translate-y-[-2px]"
                            onClick={() => goToTask(task)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              {task.boardName && (
                                <CardDescription className="flex items-center mt-1">
                                  <Clipboard className="h-3 w-3 mr-1" />
                                  {task.boardName}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="pb-2">
                              {task.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {task.priority && (
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                )}
                                {task.dueDate && (
                                  <Badge variant="outline" className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {format(task.dueDate.toDate(), "MMM d, yyyy")}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2 text-xs text-gray-500">
                              {task.columnName && (
                                <span>Status: {task.columnName}</span>
                              )}
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        {activeTab === "all" ? (
                          <>
                            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                              No tasks assigned to you
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              When tasks are assigned to you, they will appear here
                            </p>
                          </>
                        ) : activeTab === "due-soon" ? (
                          <>
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                              No tasks due soon
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              You don't have any tasks due in the next 3 days
                            </p>
                          </>
                        ) : activeTab === "overdue" ? (
                          <>
                            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                              No overdue tasks
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              You don't have any overdue tasks - great job!
                            </p>
                          </>
                        ) : (
                          <>
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                              No tasks without due dates
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              All your tasks have due dates assigned
                            </p>
                          </>
                        )}
                        <Button 
                          className="mt-4"
                          onClick={() => navigate('/')}
                        >
                          Back to Dashboard
                        </Button>
                      </div>
                    )}
                  </>
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