"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Schema for class validation
const classSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  description: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
  };
}

export function ClassForm({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: ClassFormProps) {
  const [formData, setFormData] = useState<ClassFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      classSchema.parse(formData);

      // Determine if we're creating or updating
      const url = isEditing
        ? `/api/classes/${initialData.id}`
        : "/api/classes";
      const method = isEditing ? "PUT" : "POST";

      // Submit the form
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "操作失败");
      }

      // Show success message
      toast.success(isEditing ? "班级更新成功" : "班级创建成功");
      
      // Close the dialog and refresh the data
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("操作失败，请重试");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑班级" : "添加班级"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "修改班级信息，点击保存提交更改。"
                : "填写班级信息，点击创建添加新班级。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                班级名称
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                班级描述
              </Label>
              <Input
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "提交中..."
                : isEditing
                ? "保存更改"
                : "创建班级"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 