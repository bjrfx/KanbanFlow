import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import React from "react";
import { FcGoogle } from "react-icons/fc";
import { Separator } from "@/components/ui/separator";

const AuthPage = () => {
  const { user, loginMutation, registerMutation, googleLogin } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to home if user is logged in
  React.useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Form submission handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      email: loginEmail,
      password: loginPassword,
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      email: registerEmail,
      username: registerUsername,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
    });
  };
  
  const handleGoogleLogin = () => {
    googleLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left column with form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  
                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-3 text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoogleLogin} 
                    className="w-full"
                  >
                    <FcGoogle className="mr-2 h-5 w-5" />
                    Sign in with Google
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Create an account</CardTitle>
                <CardDescription>
                  Enter your details to create a new account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="johndoe"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                  
                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-3 text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoogleLogin} 
                    className="w-full"
                  >
                    <FcGoogle className="mr-2 h-5 w-5" />
                    Sign up with Google
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Right column with hero section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/80 p-12 text-white">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-6">Kanban Board</h1>
          <p className="text-xl mb-8">
            A modern task management application with drag-and-drop functionality,
            multiple boards, and team collaboration features.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 mr-4 rounded-full bg-white text-primary flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="text-lg font-semibold">Organized Workflow</h3>
                <p>Keep your tasks organized in a visual, flexible Kanban board.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 mr-4 rounded-full bg-white text-primary flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="text-lg font-semibold">Team Collaboration</h3>
                <p>Invite team members and collaborate on projects in real-time.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 mr-4 rounded-full bg-white text-primary flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="text-lg font-semibold">Works Offline</h3>
                <p>Access your boards and tasks even when you're offline.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;