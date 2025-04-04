import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Board } from "@/types";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
  });
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBoardName.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', '/api/boards', {
        name: newBoardName,
        description: newBoardDescription
      });
      
      const newBoard = await response.json();
      
      // Invalidate boards query
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      
      // Reset form and close
      setNewBoardName('');
      setNewBoardDescription('');
      setIsCreatingBoard(false);
      
      // Navigate to the new board
      navigate(`/board/${newBoard.id}`);
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Boards</h1>
              <Button onClick={() => setIsCreatingBoard(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Board
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {isCreatingBoard && (
                  <Card className="mb-6">
                    <form onSubmit={handleCreateBoard}>
                      <CardHeader>
                        <CardTitle>Create New Board</CardTitle>
                        <CardDescription>Create a new board to organize your tasks</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="boardName">Board Name</Label>
                          <Input
                            id="boardName"
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            placeholder="Enter board name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="boardDescription">Description (optional)</Label>
                          <Input
                            id="boardDescription"
                            value={newBoardDescription}
                            onChange={(e) => setNewBoardDescription(e.target.value)}
                            placeholder="Enter board description"
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => setIsCreatingBoard(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={isSubmitting || !newBoardName.trim()}
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating...
                            </>
                          ) : "Create Board"}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                )}
                
                {boards && boards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {boards.map((board) => (
                      <Card 
                        key={board.id} 
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md", 
                          "hover:translate-y-[-2px]"
                        )}
                        onClick={() => navigate(`/board/${board.id}`)}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                            {board.name}
                          </CardTitle>
                          <CardDescription className="text-sm line-clamp-2">
                            {board.description || "No description provided"}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Created: {format(new Date(board.createdAt), "MMM d, yyyy")}
                          </span>
                          <span>
                            Updated: {format(new Date(board.updatedAt), "MMM d, yyyy")}
                          </span>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      No boards yet
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Get started by creating your first board
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => setIsCreatingBoard(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Board
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        
        {/* Mobile navigation */}
        <MobileNavigation onAddTask={() => setIsCreatingBoard(true)} />
      </div>
    </div>
  );
}
