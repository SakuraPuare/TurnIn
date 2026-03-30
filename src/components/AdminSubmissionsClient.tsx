"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubmissionReviewDialog } from "@/components/SubmissionReviewDialog";

/**
 * [REV-02] 管理端审核工作台
 *
 * 设计意图：
 * - 审核页不仅要展示提交记录，还要承担“筛选、定位、审核后局部刷新”的工作台职责。
 * - 因此前端这里维护了一份本地提交状态，用于在审核成功后即时回写，而不是强制整页刷新。
 *
 * 文档映射：
 * - docs/user-operation-manual.md
 * - docs/module-feature-matrix.md
 * - docs/test-and-acceptance-specification.md
 */
interface ClassOption {
  id: string;
  name: string;
}

interface AssignmentOption {
  id: string;
  title: string;
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
    requiredFields: {
      name: string;
      label: string;
    }[];
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

interface AdminSubmissionsClientProps {
  submissions: SubmissionItem[];
  classes: ClassOption[];
  assignments: AssignmentOption[];
}

function getStatusStyle(status: SubmissionItem["status"]) {
  switch (status) {
    case "completed":
      return {
        label: "审核通过",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "failed":
      return {
        label: "退回修改",
        className: "bg-red-100 text-red-700",
      };
    default:
      return {
        label: "待审核",
        className: "bg-amber-100 text-amber-700",
      };
  }
}

function parseSubmissionSummary(rawValue?: string | null) {
  if (!rawValue) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "";
    }

    return Object.values(parsed)
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" / ");
  } catch (_error) {
    return "";
  }
}

export function AdminSubmissionsClient({
  submissions: initialSubmissions,
  classes,
  assignments,
}: AdminSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    const matchesClass =
      classFilter === "all" || submission.student.class.id === classFilter;
    const matchesAssignment =
      assignmentFilter === "all" || submission.assignment.id === assignmentFilter;
    const searchKeyword = keyword.trim().toLowerCase();
    const summary = parseSubmissionSummary(submission.formData).toLowerCase();
    const matchesKeyword =
      !searchKeyword ||
      submission.student.name.toLowerCase().includes(searchKeyword) ||
      submission.student.studentId.toLowerCase().includes(searchKeyword) ||
      submission.assignment.title.toLowerCase().includes(searchKeyword) ||
      submission.student.class.name.toLowerCase().includes(searchKeyword) ||
      summary.includes(searchKeyword);

    return matchesStatus && matchesClass && matchesAssignment && matchesKeyword;
  });

  const completedCount = submissions.filter((item) => item.status === "completed").length;
  const failedCount = submissions.filter((item) => item.status === "failed").length;
  const pendingCount = submissions.filter((item) => item.status === "pending").length;

  const handleOpenReview = (submission: SubmissionItem) => {
    setSelectedSubmission(submission);
    setDialogOpen(true);
  };

  const handleReviewed = (updatedSubmission: SubmissionItem) => {
    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === updatedSubmission.id
          ? {
              ...submission,
              ...updatedSubmission,
            }
          : submission,
      ),
    );
    setSelectedSubmission(updatedSubmission);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">提交列表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            汇总查看学生作业提交状态，并直接完成审核与退回。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>审核通过</CardTitle>
              <CardDescription>已确认无误的提交</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-emerald-600">
              {completedCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>待审核</CardTitle>
              <CardDescription>等待管理员处理的提交</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-amber-600">
              {pendingCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>退回修改</CardTitle>
              <CardDescription>需要学生重新处理的提交</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-red-600">
              {failedCount}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
            <CardDescription>按班级、作业、状态和关键词过滤提交记录。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
                placeholder="搜索学生/学号/作业"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              <option value="all">全部班级</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>

            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              <option value="all">全部作业</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              <option value="all">全部状态</option>
              <option value="pending">待审核</option>
              <option value="completed">审核通过</option>
              <option value="failed">退回修改</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>提交明细</CardTitle>
            <CardDescription>
              当前筛选结果共 {filteredSubmissions.length} 条。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                当前筛选条件下没有提交记录。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>班级</TableHead>
                    <TableHead>作业</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>附件</TableHead>
                    <TableHead>审核备注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => {
                    const status = getStatusStyle(submission.status);

                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.student.name} ({submission.student.studentId})
                        </TableCell>
                        <TableCell>{submission.student.class.name}</TableCell>
                        <TableCell>{submission.assignment.title}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(submission.updatedAt).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          {submission.fileUrl ? (
                            <Link
                              href={submission.fileUrl}
                              target="_blank"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              查看附件
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {submission.reviewNotes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(submission)}
                          >
                            审核处理
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SubmissionReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        submission={selectedSubmission}
        onReviewed={handleReviewed}
      />
    </>
  );
}
