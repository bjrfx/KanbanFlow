import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClipboardList, Loader2, Plus, Columns, MoreVertical, Edit, Trash } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Board, createBoard, updateBoard, deleteBoard, getUserBoards, onUserBoardsChange } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  
  // Edit board state
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editedBoardName, setEditedBoardName] = useState("");
  const [editedBoardDescription, setEditedBoardDescription] = useState("");
  
  // Delete board state
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
  
  // Fetch user boards from Firestore
  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ['boards', user?.uid],
    queryFn: () => user ? getUserBoards(user.uid) : Promise.resolve([]),
    enabled: !!user,
  });
  
  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error("User not authenticated");
      return createBoard(user.uid, data);
    },
    onSuccess: (newBoard) => {
      // Invalidate boards query to refetch
      queryClient.invalidateQueries({ queryKey: ['boards', user?.uid] });
      
      // Reset form and close
      setNewBoardName('');
      setNewBoardDescription('');
      setIsCreatingBoard(false);
      
      // Show success toast
      toast({
        title: "Board created",
        description: "Your new board has been created successfully.",
      });
      
      // Navigate to the new board
      navigate(`/board/${newBoard.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating board",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update board mutation
  const updateBoardMutation = useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string, data: { name: string; description?: string } }) => {
      return updateBoard(boardId, data);
    },
    onSuccess: () => {
      // Invalidate boards query to refetch
      queryClient.invalidateQueries({ queryKey: ['boards', user?.uid] });
      
      // Reset form and close
      setEditingBoard(null);
      setEditedBoardName('');
      setEditedBoardDescription('');
      
      // Show success toast
      toast({
        title: "Board updated",
        description: "Your board has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating board",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      return deleteBoard(boardId);
    },
    onSuccess: () => {
      // Invalidate boards query to refetch
      queryClient.invalidateQueries({ queryKey: ['boards', user?.uid] });
      
      // Reset state
      setDeletingBoard(null);
      
      // Show success toast
      toast({
        title: "Board deleted",
        description: "Your board has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting board",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Set up real-time listener for user boards
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up real-time listener for user boards:", user.uid);
    
    const unsubscribe = onUserBoardsChange(user.uid, (updatedBoards) => {
      console.log("Boards updated:", updatedBoards);
      queryClient.setQueryData(['boards', user.uid], updatedBoards);
    });
    
    return () => {
      console.log("Cleaning up boards listener");
      unsubscribe();
    };
  }, [user]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBoardName.trim()) {
      return;
    }
    
    createBoardMutation.mutate({
      name: newBoardName,
      description: newBoardDescription || undefined
    });
  };
  
  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setEditedBoardName(board.name);
    setEditedBoardDescription(board.description || "");
  };
  
  const handleUpdateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingBoard || !editedBoardName.trim()) {
      return;
    }
    
    updateBoardMutation.mutate({
      boardId: editingBoard.id,
      data: {
        name: editedBoardName,
        description: editedBoardDescription || undefined
      }
    });
  };
  
  const handleDeleteBoard = (board: Board) => {
    setDeletingBoard(board);
  };
  
  const confirmDeleteBoard = () => {
    if (!deletingBoard) return;
    
    deleteBoardMutation.mutate(deletingBoard.id);
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar}
          title="My Dashboard"
          icon={<Columns className="h-4 w-4 text-white" />}
        />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Boards</h1>
              <Button onClick={() => setIsCreatingBoard(true)} data-new-board-button="true">
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
                          disabled={createBoardMutation.isPending || !newBoardName.trim()}
                        >
                          {createBoardMutation.isPending ? (
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
                          "relative transition-all hover:shadow-md", 
                          "hover:translate-y-[-2px]"
                        )}
                      >
                        {/* Add dropdown menu in top right */}
                        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditBoard(board);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-500 dark:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBoard(board);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Make body clickable for navigation */}
                        <div onClick={() => navigate(`/board/${board.id}`)} className="cursor-pointer">
                          <CardHeader>
                            <CardTitle className="flex items-center pr-8">
                              <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                              {board.name}
                            </CardTitle>
                            <CardDescription className="text-sm line-clamp-2">
                              {board.description || "No description provided"}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              Created: {format(board.createdAt.toDate(), "MMM d, yyyy")}
                            </span>
                            <span>
                              Updated: {format(board.updatedAt.toDate(), "MMM d, yyyy")}
                            </span>
                          </CardFooter>
                        </div>
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
      
      {/* Edit Board Dialog */}
      <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>
              Make changes to your board here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBoard}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editBoardName">Board Name</Label>
                <Input
                  id="editBoardName"
                  value={editedBoardName}
                  onChange={(e) => setEditedBoardName(e.target.value)}
                  placeholder="Enter board name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBoardDescription">Description (optional)</Label>
                <Input
                  id="editBoardDescription"
                  value={editedBoardDescription}
                  onChange={(e) => setEditedBoardDescription(e.target.value)}
                  placeholder="Enter board description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingBoard(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateBoardMutation.isPending || !editedBoardName.trim()}
              >
                {updateBoardMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Board Dialog */}
      <Dialog open={!!deletingBoard} onOpenChange={(open) => !open && setDeletingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this board? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium">
              Board: <span className="font-bold">{deletingBoard?.name}</span>
            </p>
            {deletingBoard?.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {deletingBoard.description}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingBoard(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBoard}
              disabled={deleteBoardMutation.isPending}
            >
              {deleteBoardMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : "Delete Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
