import { useState } from "react";
import { useBoard } from "@/hooks/use-board";
import { Board } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface BoardModalProps {
  board: Board;
  onClose: () => void;
}

export function BoardModal({ board, onClose }: BoardModalProps) {
  const { updateBoard } = useBoard();
  
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateBoard({
        name,
        description,
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating board:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Board Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="boardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Board Name
              </Label>
              <Input
                id="boardName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter board name"
                required
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="boardDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </Label>
              <Textarea
                id="boardDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter board description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
