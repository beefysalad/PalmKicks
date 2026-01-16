"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { loginSchema, TLoginSchema } from "../../../../shared/zod/login-zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (values: TLoginSchema) => {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid username or password");
      }

      return result;
    },
    onSuccess: () => {
      router.push("/admin/dashboard");
      router.refresh();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const onSubmit = (values: TLoginSchema) => signInMutation.mutate(values);

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted p-4'>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            <div className='space-y-2'>
              <Label
                htmlFor='username'
                className={`${
                  form.formState.errors.username ? "text-red-500" : null
                } text-sm font-medium`}
              >
                {form.formState.errors.username
                  ? form.formState.errors.username.message
                  : "Username"}
              </Label>
              <Input
                id='username'
                type='text'
                placeholder='Enter your username'
                {...form.register("username")}
                required
                autoFocus
                disabled={signInMutation.isPending}
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
                  {...form.register("password")}
                  required
                  disabled={signInMutation.isPending}
                  className='h-11 pr-10 transition-all focus-visible:ring-2'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={signInMutation.isPending}
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
              disabled={signInMutation.isPending}
            >
              {signInMutation.isPending ? (
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
};

export default LoginPage;
