"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { patch } from "@/lib/api";
import { Button } from "@/components/ui/button";
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

/**
 * [REV-03] 审核处理弹窗
 *
 * 设计意图：
 * - 管理员审核时需要看到“学生填写内容 + 学生备注 + 附件 + 审核输入框”一整套上下文。
 * - 这里把解析展示和状态变更放在同一弹窗，保证审核动作具备完整证据链。
 *
 * 文档映射：
 * - docs/user-operation-manual.md
 * - docs/use-case-specification.md
 */
interface SubmissionRequiredField {
  name: string;
  label: string;
}

interface SubmissionItem {
  id: string;
  status: "pending" | "completed" | "failed";
  notes?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  formData?: string | null;
  fileUrl?: string | null;
  updatedAt: string;
  assignment: {
    id: string;
    title: string;
    deadline: string;
    requiredFields: SubmissionRequiredField[];
  };
  student: {
    name: string;
    studentId: string;
    class: {
      id: string;
      name: string;
    };
  };
}

interface SubmissionReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionItem | null;
  onReviewed: (submission: SubmissionItem) => void;
}

function parseSubmissionFormData(
  rawValue?: string | null,
  requiredFields: SubmissionRequiredField[] = [],
) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    return Object.entries(parsed)
      .filter(([, value]) => String(value ?? "").trim())
      .map(([key, value]) => ({
        label: requiredFields.find((field) => field.name === key)?.label || key,
        value: String(value),
      }));
  } catch (_error) {
    return [];
  }
}

export function SubmissionReviewDialog({
  open,
  onOpenChange,
  submission,
  onReviewed,
}: SubmissionReviewDialogProps) {
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submission || !open) {
      return;
    }

    setStatus(submission.status);
    setReviewNotes(submission.reviewNotes || "");
  }, [submission, open]);

  if (!submission) {
    return null;
  }

  const formEntries = parseSubmissionFormData(
    submission.formData,
    submission.assignment.requiredFields,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedSubmission = await patch<SubmissionItem>(
        `/admin/submissions/${submission.id}`,
        {
          status,
          reviewNotes,
        },
      );

      toast.success("提交审核信息已更新");
      onReviewed(updatedSubmission);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("更新审核信息失败");
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
            <DialogTitle>审核提交</DialogTitle>
            <DialogDescription>
              {submission.student.name}（{submission.student.studentId}） /{" "}
              {submission.assignment.title}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 rounded-md border p-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">班级</div>
                <div className="mt-1 font-medium">{submission.student.class.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">截止时间</div>
                <div className="mt-1 font-medium">
                  {new Date(submission.assignment.deadline).toLocaleString("zh-CN")}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">学生提交时间</div>
                <div className="mt-1 font-medium">
                  {new Date(submission.updatedAt).toLocaleString("zh-CN")}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">最近审核时间</div>
                <div className="mt-1 font-medium">
                  {submission.reviewedAt
                    ? new Date(submission.reviewedAt).toLocaleString("zh-CN")
                    : "-"}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>学生补充信息</Label>
              <div className="rounded-md border p-4 text-sm">
                {formEntries.length > 0 ? (
                  <div className="space-y-2">
                    {formEntries.map((entry) => (
                      <div key={entry.label}>
                        <span className="font-medium">{entry.label}：</span>
                        {entry.value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">未填写附加字段</div>
                )}

                {submission.notes && (
                  <div className="mt-3 border-t pt-3">
                    <div className="font-medium">学生备注</div>
                    <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {submission.notes}
                    </div>
                  </div>
                )}

                {submission.fileUrl && (
                  <div className="mt-3 border-t pt-3">
                    <Link
                      href={submission.fileUrl}
                      target="_blank"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      查看附件
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="submission-status">审核状态</Label>
              <select
                id="submission-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "pending" | "completed" | "failed")
                }
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              >
                <option value="pending">待处理</option>
                <option value="completed">审核通过</option>
                <option value="failed">退回修改</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="review-notes">审核备注</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="min-h-28"
                placeholder="填写审核意见、驳回原因或补充说明"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存审核结果"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
