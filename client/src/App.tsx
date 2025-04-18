import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Board from "@/pages/board";
import Calendar from "@/pages/calendar";
import MyTasks from "@/pages/my-tasks";
import Notifications from "@/pages/notifications";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "./pages/auth-page";
import { AuthProvider } from "./providers/auth-provider";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/board/:id" component={Board} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/my-tasks" component={MyTasks} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthProvider>
      <Router />
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center font-medium z-50">
          You are offline. Some features may be limited.
        </div>
      )}
      <Toaster />
    </AuthProvider>
  );
}

export default App;
