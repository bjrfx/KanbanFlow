import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardProvider } from "@/providers/BoardProvider";
import { useQuery } from "@tanstack/react-query";
import { Board as BoardType } from "@/types";
import { TaskModal } from "@/components/modals/TaskModal";

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const boardId = parseInt(id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Fetch the current board for header display
  const { data: board } = useQuery<BoardType>({
    queryKey: [`/api/boards/${boardId}`],
    select: data => data.board,
  });
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const openNewTaskModal = () => {
    setShowNewTaskModal(true);
  };
  
  const closeNewTaskModal = () => {
    setShowNewTaskModal(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to create a new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewTaskModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  if (isNaN(boardId)) {
    return <div>Invalid board ID</div>;
  }
  
  return (
    <BoardProvider boardId={boardId}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            toggleSidebar={toggleSidebar} 
            currentBoardId={boardId}
            selectedBoard={board}
          />
          
          <KanbanBoard boardId={boardId} />
          
          {/* Mobile navigation */}
          <MobileNavigation onAddTask={openNewTaskModal} />
        </div>
      </div>
    </BoardProvider>
  );
}
