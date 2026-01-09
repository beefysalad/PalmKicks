"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (login(username, password)) {
      router.push("/admin/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-2xl'>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='username'>Username</Label>
              <Input
                id='username'
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className='text-sm text-destructive'>{error}</p>
            )}
            <Button type='submit' className='w-full'>
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

