"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { post, put } from "@/lib/api";
import { stringifyRequiredFieldOptions, parseRequiredFieldOptions } from "@/lib/submission";

/**
 * [ASM-03] 作业配置表单
 *
 * 设计意图：
 * - 该表单不是普通 CRUD 表单，核心在于把“作业基础信息 + 适用班级 + 动态字段配置”收束到一次编辑动作中。
 * - 字段标识、字段类型、选项序列化逻辑都与学生提交链路共享，保证配置和运行时行为保持同源。
 *
 * 文档映射：
 * - docs/software-design-specification.md
 * - docs/use-case-specification.md
 * - docs/module-feature-matrix.md
 */
const requiredFieldSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "字段标识不能为空")
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "字段标识仅支持字母、数字和下划线，且需以字母开头"),
    label: z.string().trim().min(1, "字段名称不能为空"),
    type: z.enum(["text", "number", "select"]),
    description: z.string().optional(),
    optionsText: z.string().optional(),
    required: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "select" && !(value.optionsText || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "下拉字段至少需要一个选项",
        path: ["optionsText"],
      });
    }
  });

const assignmentSchema = z.object({
  title: z.string().trim().min(1, "作业标题不能为空"),
  description: z.string().optional(),
  deadline: z
    .string()
    .min(1, "截止时间不能为空")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "截止时间格式不正确"),
  status: z.enum(["active", "closed"]),
  fileNameFormat: z.string().trim().min(1, "文件命名格式不能为空"),
  classIds: z.array(z.string()).min(1, "至少选择一个班级"),
  requiredFields: z.array(requiredFieldSchema),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface ClassOption {
  id: string;
  name: string;
}

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classes: ClassOption[];
  initialData?: {
    id: string;
    title: string;
    description?: string | null;
    deadline: string;
    status: "active" | "closed";
    fileNameFormat: string;
    classes: ClassOption[];
    requiredFields?: {
      id?: string;
      name: string;
      label: string;
      type: "text" | "number" | "select";
      description?: string | null;
      options?: string | null;
      required: boolean;
    }[];
  };
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => input.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getInitialFormData(initialData?: AssignmentFormProps["initialData"]): AssignmentFormData {
  return {
    title: initialData?.title || "",
    description: initialData?.description || "",
    deadline: formatDateTimeLocal(initialData?.deadline),
    status: initialData?.status || "active",
    fileNameFormat: initialData?.fileNameFormat || "{studentId}_{assignmentTitle}",
    classIds: initialData?.classes.map((item) => item.id) || [],
    requiredFields:
      initialData?.requiredFields?.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        description: field.description || "",
        optionsText: parseRequiredFieldOptions(field.options).join("\n"),
        required: field.required,
      })) || [],
  };
}

export function AssignmentForm({
  open,
  onOpenChange,
  onSuccess,
  classes,
  initialData,
}: AssignmentFormProps) {
  const [formData, setFormData] = useState<AssignmentFormData>(getInitialFormData(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;
  const hasClasses = classes.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(getInitialFormData(initialData));
  }, [initialData, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassToggle = (classId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      classIds: checked
        ? [...new Set([...prev.classIds, classId])]
        : prev.classIds.filter((id) => id !== classId),
    }));
  };

  const handleRequiredFieldChange = (
    index: number,
    key: keyof AssignmentFormData["requiredFields"][number],
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.map((field, fieldIndex) =>
        fieldIndex === index
          ? {
              ...field,
              [key]: value,
            }
          : field,
      ),
    }));
  };

  const handleAddRequiredField = () => {
    setFormData((prev) => ({
      ...prev,
      requiredFields: [
        ...prev.requiredFields,
        {
          name: "",
          label: "",
          type: "text",
          description: "",
          optionsText: "",
          required: true,
        },
      ],
    }));
  };

  const handleRemoveRequiredField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = assignmentSchema.parse({
        ...formData,
        description: formData.description?.trim() || "",
        fileNameFormat: formData.fileNameFormat.trim(),
        classIds: [...new Set(formData.classIds)],
        requiredFields: formData.requiredFields.map((field) => ({
          ...field,
          name: field.name.trim(),
          label: field.label.trim(),
          description: field.description?.trim() || "",
          optionsText: field.optionsText?.trim() || "",
        })),
      });

      const duplicateNames = validatedData.requiredFields
        .map((field) => field.name)
        .filter((name, index, array) => array.indexOf(name) !== index);

      if (duplicateNames.length > 0) {
        toast.error(`字段标识重复：${duplicateNames[0]}`);
        return;
      }

      const payload = {
        ...validatedData,
        requiredFields: validatedData.requiredFields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          description: field.description || "",
          options: stringifyRequiredFieldOptions(field.optionsText, field.type),
          required: field.required,
        })),
      };

      const url = isEditing
        ? `/admin/assignments/${initialData.id}`
        : "/admin/assignments";

      if (isEditing) {
        await put(url, payload);
      } else {
        await post(url, payload);
      }

      toast.success(isEditing ? "作业更新成功" : "作业创建成功");
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
      <DialogContent className="sm:max-w-[720px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑作业" : "新建作业"}</DialogTitle>
            <DialogDescription>
              配置作业标题、截止时间和适用班级，创建后即可进入提交流程。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">作业标题</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="例如：第一周实验报告"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">作业说明</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="补充作业要求、文件说明或评分标准"
                className="min-h-24"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deadline">截止时间</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="active">进行中</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fileNameFormat">文件命名格式</Label>
              <Input
                id="fileNameFormat"
                name="fileNameFormat"
                value={formData.fileNameFormat}
                onChange={handleChange}
                placeholder="{studentId}_{assignmentTitle}"
                required
              />
              <p className="text-xs text-muted-foreground">
                可用于后续提交命名规则校验，例如
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">
                  {"{studentId}_{assignmentTitle}"}
                </code>
                。
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <Label>适用班级</Label>
                <span className="text-xs text-muted-foreground">至少选择一个班级</span>
              </div>
              {hasClasses ? (
                <div className="grid max-h-56 gap-3 overflow-y-auto rounded-md border p-4 md:grid-cols-2">
                  {classes.map((classItem) => (
                    <label
                      key={classItem.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={formData.classIds.includes(classItem.id)}
                        onCheckedChange={(checked) =>
                          handleClassToggle(classItem.id, checked === true)
                        }
                      />
                      <span>{classItem.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  当前还没有班级。请先在“班级管理”中创建班级，再创建作业。
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>提交必填字段</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    可配置文本、数字或下拉项，学生提交时会按此生成表单。
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRequiredField}>
                  添加字段
                </Button>
              </div>

              {formData.requiredFields.length === 0 ? (
                <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  当前没有附加字段。学生只需上传附件或填写备注即可完成提交。
                </div>
              ) : (
                <div className="grid gap-3">
                  {formData.requiredFields.map((field, index) => (
                    <div key={`${field.name}-${index}`} className="rounded-md border p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor={`field-name-${index}`}>字段标识</Label>
                          <Input
                            id={`field-name-${index}`}
                            value={field.name}
                            onChange={(e) =>
                              handleRequiredFieldChange(index, "name", e.target.value)
                            }
                            placeholder="例如：teamName"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`field-label-${index}`}>展示名称</Label>
                          <Input
                            id={`field-label-${index}`}
                            value={field.label}
                            onChange={(e) =>
                              handleRequiredFieldChange(index, "label", e.target.value)
                            }
                            placeholder="例如：小组名称"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr_auto]">
                        <div className="grid gap-2">
                          <Label htmlFor={`field-type-${index}`}>字段类型</Label>
                          <select
                            id={`field-type-${index}`}
                            value={field.type}
                            onChange={(e) =>
                              handleRequiredFieldChange(
                                index,
                                "type",
                                e.target.value as "text" | "number" | "select",
                              )
                            }
                            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                          >
                            <option value="text">文本</option>
                            <option value="number">数字</option>
                            <option value="select">下拉选择</option>
                          </select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`field-description-${index}`}>字段说明</Label>
                          <Input
                            id={`field-description-${index}`}
                            value={field.description || ""}
                            onChange={(e) =>
                              handleRequiredFieldChange(index, "description", e.target.value)
                            }
                            placeholder="补充填写说明，可选"
                          />
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                handleRequiredFieldChange(index, "required", checked === true)
                              }
                            />
                            必填
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRequiredField(index)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>

                      {field.type === "select" && (
                        <div className="mt-4 grid gap-2">
                          <Label htmlFor={`field-options-${index}`}>下拉选项</Label>
                          <Textarea
                            id={`field-options-${index}`}
                            value={field.optionsText || ""}
                            onChange={(e) =>
                              handleRequiredFieldChange(index, "optionsText", e.target.value)
                            }
                            className="min-h-20"
                            placeholder={"每行一个选项，例如：\n第一组\n第二组"}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasClasses}>
              {isSubmitting ? "提交中..." : isEditing ? "保存更改" : "创建作业"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
