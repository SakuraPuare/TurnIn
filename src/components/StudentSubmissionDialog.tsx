"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postForm } from "@/lib/api";
import { buildExpectedFileBase, parseRequiredFieldOptions } from "@/lib/submission";

interface Student {
  id: string;
  studentId: string;
  name: string;
}

interface RequiredField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "select";
  description?: string | null;
  options?: string | null;
  required: boolean;
}

interface Submission {
  id: string;
  status: string;
  fileUrl?: string | null;
  notes?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  formData?: string | null;
  updatedAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  status: string;
  fileNameFormat: string;
  requiredFields: RequiredField[];
  submission?: Submission | null;
}

interface StudentSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  student: Student | null;
  onSuccess: () => Promise<void> | void;
}

function parseSubmissionValues(rawValue?: string | null) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch (_error) {
    return {};
  }
}

export function StudentSubmissionDialog({
  open,
  onOpenChange,
  assignment,
  student,
  onSuccess,
}: StudentSubmissionDialogProps) {
  const [notes, setNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !assignment) {
      return;
    }

    setNotes(assignment.submission?.notes || "");
    setFieldValues(parseSubmissionValues(assignment.submission?.formData));
    setFile(null);
  }, [assignment, open]);

  if (!assignment || !student) {
    return null;
  }

  const expectedFileBase = buildExpectedFileBase(assignment.fileNameFormat, {
    studentId: student.studentId,
    assignmentTitle: assignment.title,
  });
  const isClosed = assignment.status === "closed";
  const reviewStatusLabel =
    assignment.submission?.status === "completed"
      ? "审核通过"
      : assignment.submission?.status === "failed"
        ? "需要修改"
        : assignment.submission?.status === "pending"
          ? "待审核"
          : null;

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("studentId", student.id);
      formData.append("notes", notes);
      formData.append("formData", JSON.stringify(fieldValues));

      if (file) {
        formData.append("file", file);
      }

      await postForm(`/assignments/${assignment.id}/submit`, formData);

      toast.success(assignment.submission ? "提交已更新" : "提交成功");
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("提交失败，请重试");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{assignment.submission ? "更新作业提交" : "提交作业"}</DialogTitle>
            <DialogDescription>
              {assignment.title}，提交人：{student.name}（{student.studentId}）
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="font-medium">附件命名要求</div>
              <div className="mt-1 text-muted-foreground">
                文件名需为
                <code className="mx-1 rounded bg-background px-1 py-0.5 text-[11px]">
                  {expectedFileBase}
                </code>
                加任意扩展名，例如
                <code className="mx-1 rounded bg-background px-1 py-0.5 text-[11px]">
                  {expectedFileBase}.pdf
                </code>
              </div>
            </div>

            {assignment.requiredFields.length > 0 && (
              <div className="grid gap-4">
                {assignment.requiredFields.map((field) => {
                  const value = fieldValues[field.name] || "";

                  return (
                    <div key={field.id} className="grid gap-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="ml-1 text-destructive">*</span>}
                      </Label>

                      {field.type === "select" ? (
                        <select
                          id={field.name}
                          value={value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                        >
                          <option value="">请选择</option>
                          {parseRequiredFieldOptions(field.options).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type === "number" ? "number" : "text"}
                          value={value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={field.description || `请输入${field.label}`}
                        />
                      )}

                      {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">备注说明</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24"
                placeholder="可填写补充说明、版本备注或特殊情况"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file">上传附件</Label>
              <div className="rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileUp className="h-4 w-4" />
                  选择本地文件
                </div>
                <Input
                  id="file"
                  type="file"
                  className="mt-3"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  支持重新上传覆盖，单个文件不超过 10MB。
                </p>
                {file && (
                  <p className="mt-2 text-xs text-foreground">当前选择：{file.name}</p>
                )}
              </div>
            </div>

            {assignment.submission?.fileUrl && (
              <div className="rounded-lg border p-4 text-sm">
                <div className="font-medium">当前已提交附件</div>
                <div className="mt-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={assignment.submission.fileUrl}
                    target="_blank"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    查看当前附件
                  </Link>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  最后更新时间：{new Date(assignment.submission.updatedAt).toLocaleString("zh-CN")}
                </p>
              </div>
            )}

            {(reviewStatusLabel || assignment.submission?.reviewNotes) && (
              <div className="rounded-lg border p-4 text-sm">
                <div className="font-medium">审核反馈</div>
                {reviewStatusLabel && (
                  <p className="mt-2 text-muted-foreground">当前状态：{reviewStatusLabel}</p>
                )}
                {assignment.submission?.reviewNotes && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {assignment.submission.reviewNotes}
                  </p>
                )}
                {assignment.submission?.reviewedAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    审核时间：{new Date(assignment.submission.reviewedAt).toLocaleString("zh-CN")}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || isClosed}>
              {isClosed ? "作业已关闭" : isSubmitting ? "提交中..." : assignment.submission ? "更新提交" : "确认提交"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
