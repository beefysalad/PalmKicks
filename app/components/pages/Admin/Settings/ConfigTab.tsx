import {
  AddConfigDataPayload,
  UpdateConfigPayload,
} from "@/app/shared/types/settings";
import { addConfigSchema } from "@/app/shared/zod/settings-zod";
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
import {
  useAddConfig,
  useDeleteConfig,
  useGetAllConfigs,
  useUpdateConfig,
} from "@/lib/settings/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2, X, Edit } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

const ConfigTab = () => {
  const { data: configs, isLoading } = useGetAllConfigs();
  const createConfigMutation = useAddConfig();
  const deleteConfigMutation = useDeleteConfig();
  const updateConfigMutation = useUpdateConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const form = useForm({
    resolver: zodResolver(addConfigSchema),
    defaultValues: {
      key: "",
      value: "",
    },
  });

  const onSubmit = (values: AddConfigDataPayload) => {
    createConfigMutation.mutateAsync(values);
    form.reset();
  };

  const onHandleDelete = (id: string) => deleteConfigMutation.mutateAsync(id);

  const handleEditStart = (id: string, value: string) => {
    setEditingId(id);
    setEditValues({ ...editValues, [id]: value });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleEditSave = (id: string) => {
    const payload: UpdateConfigPayload = {
      id,
      value: editValues[id],
    };
    updateConfigMutation.mutateAsync(payload);
    setEditingId(null);
    setEditValues({});
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
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='flex gap-4 flex-col md:flex-row'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='config-key'>Key</Label>
                <Input
                  id='config-key'
                  placeholder='FACEBOOK_URL'
                  {...form.register("key")}
                  className={form.formState.errors.key ? "border-red-500" : ""}
                />
                {form.formState.errors.key && (
                  <p className='text-red-500 text-sm'>
                    {form.formState.errors.key.message}
                  </p>
                )}
              </div>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='config-value'>Value</Label>
                <Input
                  id='config-value'
                  placeholder='fb.com/palmkicks'
                  {...form.register("value")}
                />
              </div>
              <div className='flex items-end'>
                <Button disabled={createConfigMutation.isPending}>
                  <Plus className='mr-2 h-4 w-4' />
                  {createConfigMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </form>
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
          </div>
        </CardHeader>
        <CardContent>
          {configs && configs.length > 0 ? (
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
                    {editingId === config.id ? (
                      <Input
                        value={editValues[config.id] || ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [config.id]: e.target.value,
                          })
                        }
                        className='font-medium'
                        autoFocus
                      />
                    ) : (
                      <Input
                        value={config.value}
                        readOnly
                        className='font-medium'
                      />
                    )}
                  </div>
                  {editingId === config.id ? (
                    <>
                      <Button
                        size='icon'
                        onClick={() => handleEditSave(config.id)}
                        disabled={updateConfigMutation.isPending}
                      >
                        <Save className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={handleEditCancel}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() => handleEditStart(config.id, config.value)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='destructive'
                        size='icon'
                        onClick={() => onHandleDelete(config.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </>
                  )}
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
