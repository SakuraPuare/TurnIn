"use client";

import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2, BookMarked, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AssignmentForm } from "@/components/AssignmentForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface ClassOption {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: "active" | "closed";
  fileNameFormat: string;
  createdAt: string;
  classes: ClassOption[];
  requiredFields?: {
    id: string;
    name: string;
    label: string;
    type: "text" | "number" | "select";
    description?: string | null;
    options?: string | null;
    required: boolean;
  }[];
  _count?: {
    submissions: number;
    requiredFields: number;
  };
}

function getAssignmentStatus(assignment: Assignment) {
  if (assignment.status === "closed") {
    return {
      label: "已关闭",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (new Date(assignment.deadline).getTime() < Date.now()) {
    return {
      label: "已逾期",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "进行中",
    className: "bg-emerald-100 text-emerald-700",
  };
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | undefined>(
    undefined,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | undefined>(
    undefined,
  );

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [assignmentData, classData] = await Promise.all([
        get<Assignment[]>("/admin/assignments"),
        get<ClassOption[]>("/admin/classes"),
      ]);

      setAssignments(assignmentData);
      setClasses(classData);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError(error instanceof Error ? error.message : "获取作业列表失败");
      toast.error("获取作业列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAssignment = () => {
    setSelectedAssignment(undefined);
    setFormOpen(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormOpen(true);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">作业管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            统一维护作业标题、截止时间和适用班级。
          </p>
        </div>
        <Button onClick={handleAddAssignment} disabled={classes.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          新建作业
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {classes.length === 0 && (
          <Alert>
            <CalendarDays className="h-4 w-4" />
            <AlertTitle>当前还不能创建作业</AlertTitle>
            <AlertDescription>
              系统中还没有班级数据。请先进入“班级管理”创建班级，再为班级分配作业。
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-muted/50 p-6 text-center">
            <BookMarked className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">暂无作业</h3>
            <p className="mb-4 mt-2 text-muted-foreground">
              当前还没有创建任何作业，建议先录入近期需要提交的任务。
            </p>
            <Button onClick={handleAddAssignment} disabled={classes.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              新建作业
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>作业标题</TableHead>
                  <TableHead>适用班级</TableHead>
                  <TableHead>截止时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>字段数</TableHead>
                  <TableHead>提交数</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div>{assignment.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          命名规则：{assignment.fileNameFormat}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {assignment.classes.length > 0
                          ? assignment.classes.map((item) => item.name).join("、")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.deadline).toLocaleString("zh-CN")}
                      </TableCell>
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
                      <TableCell>{assignment._count?.requiredFields || 0}</TableCell>
                      <TableCell>{assignment._count?.submissions || 0}</TableCell>
                      <TableCell>
                        {new Date(assignment.createdAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAssignment(assignment)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">编辑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAssignment(assignment)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">删除</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AssignmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchData}
        classes={classes}
        initialData={selectedAssignment}
      />

      {assignmentToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={fetchData}
          title="删除作业"
          description={`确定要删除作业 "${assignmentToDelete.title}" 吗？相关提交记录也会一并删除，且不可恢复。`}
          itemId={assignmentToDelete.id}
          apiEndpoint="/api/admin/assignments"
        />
      )}

      <Toaster position="top-right" />
    </>
  );
}
