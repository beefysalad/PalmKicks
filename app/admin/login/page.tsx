"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        setIsLoading(false);
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted p-4'>
      {/* Decorative elements */}
      <div className='absolute inset-0 -z-10'>
        <div className='absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/5 blur-3xl sm:h-96 sm:w-96' />
        <div className='absolute bottom-1/4 right-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl delay-1000 sm:h-96 sm:w-96' />
      </div>

      <Card className='w-full max-w-md border-border/50 shadow-2xl backdrop-blur-sm'>
        <CardHeader className='space-y-3 text-center'>
          <div className='mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
            <ShieldCheck className='h-8 w-8 text-primary' />
          </div>
          <CardTitle className='text-2xl font-bold tracking-tight sm:text-3xl'>
            Admin Portal
          </CardTitle>
          <CardDescription className='text-base'>
            Sign in to manage your store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='username' className='text-sm font-medium'>
                Username
              </Label>
              <Input
                id='username'
                type='text'
                placeholder='Enter your username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
                className='h-11 transition-all focus-visible:ring-2'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password' className='text-sm font-medium'>
                Password
              </Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? "text" : "password"}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className='h-11 pr-10 transition-all focus-visible:ring-2'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert
                variant='destructive'
                className='animate-in fade-in slide-in-from-top-1'
              >
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type='submit'
              className='h-11 w-full font-medium shadow-lg transition-all hover:shadow-xl disabled:opacity-50'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className='mt-6 border-t border-border/50 pt-6'>
            <p className='text-center text-xs text-muted-foreground'>
              Authorized personnel only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
