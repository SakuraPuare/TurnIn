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

// Schema for student validation
const studentSchema = z.object({
  studentId: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classId: string;
  initialData?: {
    id: string;
    studentId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
}

export function StudentForm({
  open,
  onOpenChange,
  onSuccess,
  classId,
  initialData,
}: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    studentId: initialData?.studentId || "",
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      studentSchema.parse(formData);

      // Determine if we're creating or updating
      const url = isEditing
        ? `/api/classes/${classId}/students/${initialData.id}`
        : `/api/classes/${classId}/students`;
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
      toast.success(isEditing ? "学生信息更新成功" : "学生添加成功");
      
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
            <DialogTitle>{isEditing ? "编辑学生" : "添加学生"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "修改学生信息，点击保存提交更改。"
                : "填写学生信息，点击添加将学生添加到班级。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="studentId" className="text-right">
                学号
              </Label>
              <Input
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isEditing}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                姓名
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
              <Label htmlFor="email" className="text-right">
                邮箱
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                电话
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone || ""}
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
                : "添加学生"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 