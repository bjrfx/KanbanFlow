import { createContext, useState } from "react";
import { Board, BoardData, Column, Task, TaskWithAssignees, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface BoardContextProps {
  boardData: BoardData | null;
  isLoading: boolean;
  error: Error | null;
  createTask: (data: { 
    title: string; 
    description?: string; 
    columnId: number; 
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }) => Promise<Task | null>;
  updateTask: (taskId: number, data: any) => Promise<Task | null>;
  deleteTask: (taskId: number) => Promise<boolean>;
  moveTask: (taskId: number, destinationColumnId: number, newOrder: number) => Promise<boolean>;
  createColumn: (name: string, color?: string) => Promise<Column | null>;
  updateColumn: (columnId: number, data: { name?: string; color?: string }) => Promise<Column | null>;
  deleteColumn: (columnId: number) => Promise<boolean>;
  inviteMember: (email: string) => Promise<boolean>;
  removeMember: (userId: number) => Promise<boolean>;
  updateBoard: (data: { name?: string; description?: string }) => Promise<Board | null>;
  assignUser: (taskId: number, userId: number) => Promise<boolean>;
  unassignUser: (taskId: number, userId: number) => Promise<boolean>;
}

export const BoardContext = createContext<BoardContextProps>({
  boardData: null,
  isLoading: false,
  error: null,
  createTask: async () => null,
  updateTask: async () => null,
  deleteTask: async () => false,
  moveTask: async () => false,
  createColumn: async () => null,
  updateColumn: async () => null,
  deleteColumn: async () => false,
  inviteMember: async () => false,
  removeMember: async () => false,
  updateBoard: async () => null,
  assignUser: async () => false,
  unassignUser: async () => false
});

export function BoardProvider({ children, boardId }: { children: React.ReactNode, boardId: number }) {
  const { toast } = useToast();
  
  const { data: boardData, isLoading, error } = useQuery<BoardData>({
    queryKey: [`/api/boards/${boardId}`],
    retry: 1,
    refetchOnWindowFocus: true
  });
  
  async function createTask(data: { 
    title: string; 
    description?: string; 
    columnId: number; 
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }): Promise<Task | null> {
    if (!boardData) return null;
    
    try {
      // Get highest order for the column
      const columnTasks = boardData.tasks.filter(task => task.columnId === data.columnId);
      const order = columnTasks.length > 0 
        ? Math.max(...columnTasks.map(task => task.order)) + 1 
        : 0;
      
      const response = await apiRequest('POST', '/api/tasks', {
        ...data,
        boardId: boardId,
        order
      });
      
      const newTask = await response.json();
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Task created",
        description: "Your task has been created successfully."
      });
      
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error creating task",
        description: "There was an error creating your task. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }
  
  async function updateTask(taskId: number, data: any): Promise<Task | null> {
    try {
      const response = await apiRequest('PUT', `/api/tasks/${taskId}`, data);
      const updatedTask = await response.json();
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully."
      });
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error updating task",
        description: "There was an error updating your task. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }
  
  async function deleteTask(taskId: number): Promise<boolean> {
    try {
      await apiRequest('DELETE', `/api/tasks/${taskId}`, null);
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error deleting task",
        description: "There was an error deleting your task. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function moveTask(taskId: number, destinationColumnId: number, newOrder: number): Promise<boolean> {
    try {
      await apiRequest('PUT', `/api/tasks/${taskId}`, {
        columnId: destinationColumnId,
        order: newOrder
      });
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      return true;
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: "Error moving task",
        description: "There was an error moving your task. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function createColumn(name: string, color: string = 'blue'): Promise<Column | null> {
    if (!boardData) return null;
    
    try {
      // Get highest order for the columns
      const order = boardData.columns.length > 0 
        ? Math.max(...boardData.columns.map(column => column.order)) + 1 
        : 0;
      
      const response = await apiRequest('POST', `/api/boards/${boardId}/columns`, {
        name,
        color,
        order
      });
      
      const newColumn = await response.json();
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Column created",
        description: "Your column has been created successfully."
      });
      
      return newColumn;
    } catch (error) {
      console.error('Error creating column:', error);
      toast({
        title: "Error creating column",
        description: "There was an error creating your column. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }
  
  async function updateColumn(columnId: number, data: { name?: string; color?: string }): Promise<Column | null> {
    try {
      const response = await apiRequest('PUT', `/api/columns/${columnId}`, {
        ...data,
        boardId
      });
      
      const updatedColumn = await response.json();
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Column updated",
        description: "Your column has been updated successfully."
      });
      
      return updatedColumn;
    } catch (error) {
      console.error('Error updating column:', error);
      toast({
        title: "Error updating column",
        description: "There was an error updating your column. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }
  
  async function deleteColumn(columnId: number): Promise<boolean> {
    try {
      await apiRequest('DELETE', `/api/columns/${columnId}?boardId=${boardId}`, null);
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Column deleted",
        description: "Your column has been deleted successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error deleting column",
        description: "There was an error deleting your column. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function inviteMember(email: string): Promise<boolean> {
    try {
      await apiRequest('POST', `/api/boards/${boardId}/members`, { email });
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Member invited",
        description: "The invitation has been sent successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error inviting member",
        description: "There was an error sending the invitation. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function removeMember(userId: number): Promise<boolean> {
    try {
      await apiRequest('DELETE', `/api/boards/${boardId}/members/${userId}`, null);
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Member removed",
        description: "The member has been removed successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: "There was an error removing the member. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function updateBoard(data: { name?: string; description?: string }): Promise<Board | null> {
    try {
      const response = await apiRequest('PUT', `/api/boards/${boardId}`, data);
      const updatedBoard = await response.json();
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "Board updated",
        description: "Your board has been updated successfully."
      });
      
      return updatedBoard;
    } catch (error) {
      console.error('Error updating board:', error);
      toast({
        title: "Error updating board",
        description: "There was an error updating your board. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }
  
  async function assignUser(taskId: number, userId: number): Promise<boolean> {
    try {
      await apiRequest('POST', `/api/tasks/${taskId}/assignees`, { userId });
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "User assigned",
        description: "The user has been assigned to the task successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error assigning user:', error);
      toast({
        title: "Error assigning user",
        description: "There was an error assigning the user to the task. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  async function unassignUser(taskId: number, userId: number): Promise<boolean> {
    try {
      await apiRequest('DELETE', `/api/tasks/${taskId}/assignees/${userId}`, null);
      
      // Update the local cache
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "User unassigned",
        description: "The user has been unassigned from the task successfully."
      });
      
      return true;
    } catch (error) {
      console.error('Error unassigning user:', error);
      toast({
        title: "Error unassigning user",
        description: "There was an error unassigning the user from the task. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  return (
    <BoardContext.Provider value={{
      boardData,
      isLoading,
      error,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      createColumn,
      updateColumn,
      deleteColumn,
      inviteMember,
      removeMember,
      updateBoard,
      assignUser,
      unassignUser
    }}>
      {children}
    </BoardContext.Provider>
  );
}
