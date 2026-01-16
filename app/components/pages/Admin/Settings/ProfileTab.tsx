import {
  changePasswordFormSchema,
  TChangePasswordFormSchema,
} from "@/app/shared/zod/change-password.zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/lib/settings/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Key, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";

const ProfileTab = () => {
  const { data: session } = useSession();
  const changePasswordMutation = useChangePassword();
  const form = useForm({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
  });
  const onSubmit = async (values: TChangePasswordFormSchema) => {
    if (!session?.user) return;
    await changePasswordMutation.mutateAsync(values);
    form.reset();
  };

  return (
    <div className='grid gap-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label>Username</Label>
              <Input
                value={session?.user?.username || "Admin"}
                disabled
                className='bg-muted'
              />
            </div>
            <div className='space-y-2'>
              <Label>Role</Label>
              <Input value='Administrator' disabled className='bg-muted' />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className='relative overflow-hidden'>
          {/* Loading Overlay */}
          <AnimatePresence>
            {changePasswordMutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm'
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className='flex flex-col items-center gap-4'
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className='h-12 w-12 text-primary' />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className='text-sm font-medium text-muted-foreground'
                  >
                    Updating your password...
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <motion.div
                className='space-y-2'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label htmlFor='current-password'>Current Password</Label>
                <Input
                  id='current-password'
                  type='password'
                  {...form.register("currentPassword")}
                  disabled={changePasswordMutation.isPending}
                  className={
                    form.formState.errors.newPassword ? "border-red-500" : ""
                  }
                />
                {form.formState.errors.currentPassword && (
                  <p className='text-xs text-red-500'>
                    {form.formState.errors.currentPassword.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className='space-y-2'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor='new-password'>New Password</Label>
                <Input
                  id='new-password'
                  type='password'
                  {...form.register("newPassword")}
                  disabled={changePasswordMutation.isPending}
                  className={
                    form.formState.errors.newPassword ? "border-red-500" : ""
                  }
                />
                {form.formState.errors.newPassword && (
                  <p className='text-xs text-red-500'>
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className='space-y-2'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor='confirm-password'>Confirm New Password</Label>
                <Input
                  id='confirm-password'
                  type='password'
                  {...form.register("confirmPassword")}
                  disabled={changePasswordMutation.isPending}
                  className={
                    form.formState.errors.confirmPassword
                      ? "border-red-500"
                      : ""
                  }
                />
                {form.formState.errors.confirmPassword && (
                  <p className='text-xs text-red-500'>
                    {form.formState.errors.confirmPassword.message}{" "}
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  disabled={changePasswordMutation.isPending}
                  className='relative overflow-hidden'
                >
                  <AnimatePresence mode='wait'>
                    {changePasswordMutation.isPaused ? (
                      <motion.div
                        key='loading'
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className='flex items-center'
                      >
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Updating...
                      </motion.div>
                    ) : (
                      <motion.div
                        key='idle'
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className='flex items-center'
                      >
                        <Key className='mr-2 h-4 w-4' />
                        Change Password
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProfileTab;
