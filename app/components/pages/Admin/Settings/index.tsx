"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Settings } from "lucide-react";
import ConfigTab from "./ConfigTab";
import ProfileTab from "./ProfileTab";

const SettingsComponent = () => {
  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold'>Settings</h1>
        <p className='text-muted-foreground'>
          Manage your account settings and store configurations
        </p>
      </div>

      <Tabs defaultValue='profile' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='profile' className='gap-2'>
            <Lock className='h-4 w-4' />
            Profile
          </TabsTrigger>
          <TabsTrigger value='configs' className='gap-2'>
            <Settings className='h-4 w-4' />
            Configurations
          </TabsTrigger>
        </TabsList>

        <TabsContent value='profile'>
          <ProfileTab />
        </TabsContent>

        <TabsContent value='configs'>
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsComponent;
