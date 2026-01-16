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
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

const ConfigTab = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [configs, setConfigs] = useState([
    { id: 1, key: "STORE_NAME", value: "My Store" },
    { id: 2, key: "CONTACT_EMAIL", value: "contact@store.com" },
    { id: 3, key: "MAINTENANCE_MODE", value: "false" },
  ]);

  const [newConfig, setNewConfig] = useState({ key: "", value: "" });

  // Config handlers
  const handleAddConfig = () => {
    if (!newConfig.key.trim() || !newConfig.value.trim()) {
      alert("Please enter both key and value!");
      return;
    }

    const exists = configs.some((c) => c.key === newConfig.key);
    if (exists) {
      alert("A configuration with this key already exists!");
      return;
    }

    setConfigs([
      ...configs,
      {
        id: Date.now(),
        key: newConfig.key.toUpperCase(),
        value: newConfig.value,
      },
    ]);
    setNewConfig({ key: "", value: "" });
  };

  const handleUpdateConfig = (id: number, value: string) => {
    setConfigs(configs.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  const handleDeleteConfig = (id: number) => {
    if (confirm("Are you sure you want to delete this configuration?")) {
      setConfigs(configs.filter((c) => c.id !== id));
    }
  };

  const handleSaveConfigs = async () => {
    setIsLoading(true);

    try {
      // Add your API call here
      // const response = await fetch('/api/admin/configs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ configs }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Configurations saved successfully!");
    } catch (error) {
      alert("Failed to save configurations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Add New Configuration</CardTitle>
          <CardDescription>
            Add a new key-value configuration pair
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='config-key'>Key</Label>
              <Input
                id='config-key'
                placeholder='e.g., STORE_NAME'
                value={newConfig.key}
                onChange={(e) =>
                  setNewConfig({
                    ...newConfig,
                    key: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='config-value'>Value</Label>
              <Input
                id='config-value'
                placeholder='e.g., My Awesome Store'
                value={newConfig.value}
                onChange={(e) =>
                  setNewConfig({
                    ...newConfig,
                    value: e.target.value,
                  })
                }
              />
            </div>
            <div className='flex items-end'>
              <Button onClick={handleAddConfig}>
                <Plus className='mr-2 h-4 w-4' />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Store Configurations</CardTitle>
              <CardDescription>
                Manage your store settings and configurations
              </CardDescription>
            </div>
            <Button onClick={handleSaveConfigs} disabled={isLoading}>
              <Save className='mr-2 h-4 w-4' />
              {isLoading ? "Saving..." : "Save All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configs.length > 0 ? (
            <div className='space-y-4'>
              {configs.map((config) => (
                <div
                  key={config.id}
                  className='flex items-center gap-4 rounded-lg border p-4'
                >
                  <div className='flex-1 space-y-2'>
                    <Label className='font-mono text-xs text-muted-foreground'>
                      {config.key}
                    </Label>
                    <Input
                      value={config.value}
                      onChange={(e) =>
                        handleUpdateConfig(config.id, e.target.value)
                      }
                      className='font-medium'
                    />
                  </div>
                  <Button
                    variant='destructive'
                    size='icon'
                    onClick={() => handleDeleteConfig(config.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className='py-8 text-center text-muted-foreground'>
              No configurations yet. Add your first one above!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigTab;
