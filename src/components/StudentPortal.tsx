"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileBadge2,
  GraduationCap,
  Hourglass,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StudentSubmissionDialog } from "@/components/StudentSubmissionDialog";

/**
 * [STU-02] 学生端聚合门户
 *
 * 设计意图：
 * - 首页要承担“班级入口、身份确认、作业列表、审核反馈”四个角色，不能把学生流程拆散到多个页面。
 * - 通过一个聚合组件把班级、学生、作业、审核状态统一串起来，降低学生的操作成本。
 *
 * 文档映射：
 * - docs/user-operation-manual.md
 * - docs/use-case-specification.md
 * - docs/module-feature-matrix.md
 */
interface ClassItem {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    students: number;
  };
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
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

function getAssignmentMeta(assignment: Assignment) {
  const submissionStatus = assignment.submission?.status;

  if (assignment.status === "closed") {
    return {
      label: "已关闭",
      className: "bg-slate-100 text-slate-700",
      actionLabel: "不可提交",
      disabled: true,
    };
  }

  if (new Date(assignment.deadline).getTime() < Date.now()) {
    return {
      label: "已截止",
      className: "bg-amber-100 text-amber-700",
      actionLabel:
        submissionStatus === "failed"
          ? "逾期重提"
          : assignment.submission
            ? "逾期更新"
            : "逾期提交",
      disabled: false,
    };
  }

  return {
    label: "进行中",
    className: "bg-emerald-100 text-emerald-700",
    actionLabel:
      submissionStatus === "failed"
        ? "重新提交"
        : assignment.submission
          ? "更新提交"
          : "立即提交",
    disabled: false,
  };
}

function getSubmissionStatusMeta(status?: string | null) {
  switch (status) {
    case "completed":
      return {
        label: "审核通过",
        className: "bg-sky-100 text-sky-700",
      };
    case "failed":
      return {
        label: "需要修改",
        className: "bg-rose-100 text-rose-700",
      };
    case "pending":
      return {
        label: "待审核",
        className: "bg-indigo-100 text-indigo-700",
      };
    default:
      return null;
  }
}

const STUDENT_PORTAL_STORAGE_KEY = "student-portal-selection";

export default function StudentPortal() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [restoredStudentId, setRestoredStudentId] = useState<string | null>(null);
  const [selectionReady, setSelectionReady] = useState(false);

  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) || null;

  const fetchAssignments = async (classId: string, studentId?: string) => {
    setLoadingAssignments(true);

    try {
      const query = studentId ? `?studentId=${studentId}` : "";
      const data = await get<Assignment[]>(`/classes/${classId}/assignments${query}`);
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error(error instanceof Error ? error.message : "获取作业列表失败");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true);

    try {
      const data = await get<{ students: Student[] }>(`/classes/${classId}`);
      setStudents(data.students);

      if (restoredStudentId) {
        const matchedStudent = data.students.find((student) => student.id === restoredStudentId);
        if (matchedStudent) {
          setSelectedStudentId(matchedStudent.id);
        }
        setRestoredStudentId(null);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error(error instanceof Error ? error.message : "获取学生列表失败");
      setStudents([]);
      setRestoredStudentId(null);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const savedSelection = window.localStorage.getItem(STUDENT_PORTAL_STORAGE_KEY);

    if (!savedSelection) {
      setSelectionReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedSelection) as {
        classId?: string;
        studentId?: string;
      };

      if (parsed.classId) {
        setSelectedClassId(parsed.classId);
      }

      if (parsed.studentId) {
        setRestoredStudentId(parsed.studentId);
      }
    } catch (_error) {
      window.localStorage.removeItem(STUDENT_PORTAL_STORAGE_KEY);
    } finally {
      setSelectionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!selectionReady) {
      return;
    }

    window.localStorage.setItem(
      STUDENT_PORTAL_STORAGE_KEY,
      JSON.stringify({
        classId: selectedClassId,
        studentId: selectedStudentId,
      }),
    );
  }, [selectedClassId, selectedStudentId, selectionReady]);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);

      try {
        const data = await get<ClassItem[]>("/classes");
        setClasses(data);
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast.error(error instanceof Error ? error.message : "获取班级列表失败");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setAssignments([]);
      setSelectedStudentId("");
      return;
    }

    setSelectedStudentId("");
    fetchStudents(selectedClassId);
    fetchAssignments(selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }

    fetchAssignments(selectedClassId, selectedStudentId || undefined);
  }, [selectedStudentId]);

  const handleOpenDialog = (assignment: Assignment) => {
    if (!selectedStudent) {
      toast.error("请先选择学生身份");
      return;
    }

    setActiveAssignment(assignment);
    setDialogOpen(true);
  };

  const submittedCount = assignments.filter((assignment) => assignment.submission).length;
  const reviewPendingCount = assignments.filter(
    (assignment) => assignment.submission?.status === "pending",
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(20,184,166,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#f7f7f2_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              学生作业递交入口
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              选定班级与身份后，直接提交你的作业附件和补充信息。
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              系统会自动带出当前班级作业、截止时间、命名规则和必填字段。已提交的作业也可以在这里继续更新。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  Step 1
                </div>
                <div className="mt-2 font-medium text-slate-900">选择班级</div>
                <p className="mt-1 text-sm text-slate-600">先定位到你的班级，系统会自动筛出可提交作业。</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  Step 2
                </div>
                <div className="mt-2 font-medium text-slate-900">确认学生身份</div>
                <p className="mt-1 text-sm text-slate-600">从班级名单中选择自己，避免提交到错误账号。</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  Step 3
                </div>
                <div className="mt-2 font-medium text-slate-900">上传并完成提交</div>
                <p className="mt-1 text-sm text-slate-600">系统会校验附件命名和作业附加字段。</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
            <div className="text-sm font-medium text-teal-300">开始提交</div>
            <div className="mt-2 text-2xl font-semibold">选择你的班级和身份</div>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">班级</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                >
                  <option value="" className="text-slate-900">
                    请选择班级
                  </option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id} className="text-slate-900">
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">学生</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!selectedClassId || loadingStudents || students.length === 0}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" className="text-slate-900">
                    {selectedClassId ? "请选择学生" : "请先选择班级"}
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id} className="text-slate-900">
                      {student.name}（{student.studentId}）
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              {selectedStudent ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-teal-400/15 p-2 text-teal-300">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {selectedStudent.name}（{selectedStudent.studentId}）
                      </div>
                      <div className="text-sm text-slate-400">已进入个人提交通道</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-slate-400">已提交</div>
                      <div className="mt-1 text-2xl font-semibold">{submittedCount}</div>
                    </div>
                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-slate-400">待审核</div>
                      <div className="mt-1 text-2xl font-semibold">{reviewPendingCount}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-slate-300">
                  选择学生后，系统会展示该学生当前班级下的提交状态，并允许直接更新历史提交。
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">班级数量</CardTitle>
              <GraduationCap className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{classes.length}</CardContent>
          </Card>
          <Card className="border-0 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">作业总数</CardTitle>
              <FileBadge2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{assignments.length}</CardContent>
          </Card>
          <Card className="border-0 bg-white/70 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">已提交</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{submittedCount}</CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">班级作业列表</h2>
              <p className="mt-1 text-sm text-slate-600">
                选择班级后即可查看作业；选择学生后可直接进行提交或更新。
              </p>
            </div>
          </div>

          {loadingClasses ? (
            <div className="rounded-[24px] border bg-white/70 p-10 text-center text-sm text-slate-500">
              正在加载班级信息...
            </div>
          ) : classes.length === 0 ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>当前还没有可选班级</AlertTitle>
              <AlertDescription>
                管理员需要先在后台创建班级并分配学生、作业，学生端才会显示提交入口。
              </AlertDescription>
            </Alert>
          ) : !selectedClassId ? (
            <div className="rounded-[24px] border bg-white/70 p-10 text-center text-sm text-slate-500">
              请先在上方选择班级。
            </div>
          ) : loadingAssignments ? (
            <div className="rounded-[24px] border bg-white/70 p-10 text-center text-sm text-slate-500">
              正在加载作业列表...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-[24px] border bg-white/70 p-10 text-center text-sm text-slate-500">
              当前班级还没有分配作业。
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {assignments.map((assignment) => {
                const meta = getAssignmentMeta(assignment);
                const submissionStatusMeta = getSubmissionStatusMeta(assignment.submission?.status);

                return (
                  <article
                    key={assignment.id}
                    className="rounded-[24px] border border-slate-200 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-slate-900">
                          {assignment.title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                          {submissionStatusMeta && (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                submissionStatusMeta.className,
                              )}
                            >
                              {submissionStatusMeta.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3 text-right text-sm">
                        <div className="text-slate-400">截止时间</div>
                        <div className="mt-1 font-medium text-slate-700">
                          {new Date(assignment.deadline).toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-12 text-sm leading-6 text-slate-600">
                      {assignment.description || "暂无作业说明，请按老师要求命名并提交附件。"}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <CalendarClock className="h-4 w-4 text-slate-400" />
                          命名规则
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {assignment.fileNameFormat}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Hourglass className="h-4 w-4 text-slate-400" />
                          附加字段
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {assignment.requiredFields.length > 0
                            ? assignment.requiredFields.map((field) => field.label).join("、")
                            : "无额外字段"}
                        </div>
                      </div>
                    </div>

                    {assignment.submission && (
                      <div
                        className={cn(
                          "mt-4 rounded-2xl border p-4 text-sm",
                          assignment.submission.status === "failed"
                            ? "border-rose-200 bg-rose-50 text-rose-800"
                            : assignment.submission.status === "completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-indigo-200 bg-indigo-50 text-indigo-800",
                        )}
                      >
                        <div>
                          最近一次提交时间：
                          {new Date(assignment.submission.updatedAt).toLocaleString("zh-CN")}
                        </div>
                        {assignment.submission.reviewNotes && (
                          <div className="mt-2 whitespace-pre-wrap">
                            审核意见：{assignment.submission.reviewNotes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">
                        {selectedStudent ? "可直接提交或更新该作业。" : "选择学生后开启提交入口。"}
                      </div>
                      <Button
                        onClick={() => handleOpenDialog(assignment)}
                        disabled={!selectedStudent || meta.disabled}
                      >
                        {meta.actionLabel}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <StudentSubmissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={activeAssignment}
        student={selectedStudent}
        onSuccess={() => fetchAssignments(selectedClassId, selectedStudentId || undefined)}
      />
    </div>
  );
}
