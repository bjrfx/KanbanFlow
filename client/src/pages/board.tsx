import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Board as BoardType, getBoard, getBoardColumns } from "@/lib/firestore";
import { Button } from "@/components/ui/button";

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Fetch the current board from Firestore
  const { data: board, isLoading: isBoardLoading, isError: isBoardError } = useQuery<BoardType>({
    queryKey: ['board', id],
    queryFn: () => getBoard(id),
    retry: 1,
  });
  
  // Fetch the board columns from Firestore
  const { data: columns, isLoading: isColumnsLoading } = useQuery({
    queryKey: ['columns', id],
    queryFn: () => getBoardColumns(id),
    enabled: !!board,
  });
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to go back to main page
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate("/");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
  
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
        
        {/* Simplified Board View - for now just showing columns */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex space-x-4 h-full">
            {isColumnsLoading ? (
              <div className="flex items-center justify-center w-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : columns && columns.length > 0 ? (
              columns.map(column => (
                <div 
                  key={column.id} 
                  className="w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md shadow-sm p-3"
                >
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: column.color || '#9CA3AF' }}
                    ></div>
                    <h3 className="font-medium">{column.name}</h3>
                  </div>
                  <div className="text-center text-gray-500 py-8">
                    Tasks will appear here
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center w-full">
                <p className="text-gray-500">No columns found for this board</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile navigation */}
        <MobileNavigation onAddTask={() => {}} />
      </div>
    </div>
  );
}
