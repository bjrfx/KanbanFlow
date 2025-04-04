import { useAuth } from "@/hooks/AuthProvider";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  ChevronDown, 
  Columns, 
  LogOut, 
  Menu, 
  Moon, 
  Search, 
  Settings, 
  Sun, 
  User 
} from "lucide-react";
import { Board } from "@/types";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  toggleSidebar: () => void;
  currentBoardId?: number;
  selectedBoard?: Board;
}

export function Header({ toggleSidebar, currentBoardId, selectedBoard }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDarkMode } = useTheme();
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [, navigate] = useLocation();
  
  // Fetch all boards for dropdown
  const { data: boards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: showBoardSelector || !!currentBoardId
  });
  
  const toggleBoardSelector = () => {
    setShowBoardSelector(!showBoardSelector);
  };
  
  const selectBoard = (boardId: number) => {
    navigate(`/board/${boardId}`);
    setShowBoardSelector(false);
  };
  
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };
  
  const toggleDarkMode = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };
  
  const handleLogout = async () => {
    await logout();
  };
  
  const openSearch = () => {
    // TODO: Implement search functionality
  };
  
  const openNotifications = () => {
    // TODO: Implement notifications functionality
  };
  
  const openUserSettings = () => {
    // TODO: Implement user settings
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 sm:px-6">
        <div className="flex items-center">
          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3 text-gray-600 dark:text-gray-300 sm:hidden" 
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Logo and title */}
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary rounded flex items-center justify-center mr-2">
              <Columns className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">Kanban</h1>
          </div>
        </div>
        
        {/* Board selection (desktop) */}
        {currentBoardId && (
          <div className="hidden md:flex items-center space-x-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current board:</span>
            <DropdownMenu open={showBoardSelector} onOpenChange={setShowBoardSelector}>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="flex items-center">
                  <span>{selectedBoard?.name || "Select Board"}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-60">
                {boards?.map((board) => (
                  <DropdownMenuItem key={board.id} onClick={() => selectBoard(board.id)}>
                    <div className="flex items-center justify-between w-full">
                      <span>{board.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(board.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" className="w-full flex items-center">
                    <span className="flex items-center text-primary">
                      <span className="i-plus mr-2"></span> Create new board
                    </span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Search button */}
          <Button variant="ghost" size="icon" onClick={openSearch}>
            <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
          
          {/* Notifications button */}
          <Button variant="ghost" size="icon" onClick={openNotifications} className="relative">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {/* Notification dot */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          {/* Dark mode toggle */}
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            )}
          </Button>
          
          {/* User avatar */}
          <DropdownMenu open={showProfileMenu} onOpenChange={setShowProfileMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.username} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {user?.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openUserSettings}>
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile board selector */}
      {currentBoardId && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden">
          <div className="relative w-full">
            <select 
              className="block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm focus:ring-primary-500 focus:border-primary-500" 
              value={currentBoardId}
              onChange={(e) => selectBoard(Number(e.target.value))}
            >
              {boards?.map((board) => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}
    </header>
  );
}
