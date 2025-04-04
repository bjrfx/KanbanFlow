import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";
import { login as loginApi, logout as logoutApi, register as registerApi, initiateGoogleLogin } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useAuth() {
  const context = useContext(AuthContext);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  const { user, isLoading, setUser } = context;
  
  async function login(email: string, password: string) {
    try {
      const { user } = await loginApi({ email, password });
      setUser(user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
      navigate("/");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
      return false;
    }
  }
  
  async function register(data: { email: string; username: string; password: string; confirmPassword: string }) {
    try {
      const { user, defaultBoardId } = await registerApi(data);
      setUser(user);
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      navigate(`/board/${defaultBoardId}`);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
      return false;
    }
  }
  
  async function logout() {
    try {
      await logoutApi();
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }
  
  function loginWithGoogle() {
    initiateGoogleLogin();
  }
  
  return {
    user,
    isLoading,
    login,
    register,
    logout,
    loginWithGoogle,
  };
}
