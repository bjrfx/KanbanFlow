import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { z } from "zod";
import { useLocation } from "wouter";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { queryClient } from "../lib/queryClient";

// Define the user type based on Firebase Auth
export type SelectUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

export type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  googleLogin: () => void;
  isAuthenticated: boolean;
};

export type LoginData = {
  email: string;
  password: string;
};

// Define user schema directly here since we can't import it
const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = userSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;

// Helper to convert Firebase user to our user type
const mapFirebaseUser = (fbUser: FirebaseUser | null): SelectUser | null => {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
  };
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      (firebaseUser) => {
        setUser(mapFirebaseUser(firebaseUser));
        setIsLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        setError(error as Error);
        setIsLoading(false);
      }
    );
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      return mapFirebaseUser(userCredential.user)!;
    },
    onSuccess: (data: SelectUser) => {
      toast({
        title: "Login successful",
        description: `Welcome back${data.displayName ? ', ' + data.displayName : ''}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      
      // Update profile with username
      await updateProfile(userCredential.user, {
        displayName: data.username
      });
      
      // Return the user with updated profile
      return mapFirebaseUser(auth.currentUser)!;
    },
    onSuccess: (user: SelectUser) => {
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
    },
    onSuccess: () => {
      // Clear any cached user data
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "There was an error logging out",
        variant: "destructive",
      });
    },
  });
  
  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Login successful",
        description: "You've signed in with Google",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message || "Could not sign in with Google",
        variant: "destructive",
      });
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        googleLogin,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}