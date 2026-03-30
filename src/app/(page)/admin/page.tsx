import {
  BookMarked,
  ClipboardCheck,
  FileUp,
  Users,
  GraduationCap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
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

export const dynamic = "force-dynamic";

function getAssignmentStatus(status: string, deadline: Date) {
  if (status === "closed") {
    return {
      label: "已关闭",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (deadline.getTime() < Date.now()) {
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

function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "审核通过";
    case "failed":
      return "退回修改";
    default:
      return "待审核";
  }
}

export default async function AdminPage() {
  const now = new Date();
  const [
    classCount,
    studentCount,
    assignmentCount,
    submissionCount,
    activeAssignmentCount,
    overdueAssignmentCount,
    completedSubmissionCount,
    failedSubmissionCount,
    pendingSubmissionCount,
    recentClasses,
    upcomingAssignments,
    recentSubmissions,
  ] = await Promise.all([
    prisma.class.count(),
    prisma.student.count(),
    prisma.assignment.count(),
    prisma.submission.count(),
    prisma.assignment.count({
      where: {
        status: "active",
        deadline: {
          gte: now,
        },
      },
    }),
    prisma.assignment.count({
      where: {
        status: "active",
        deadline: {
          lt: now,
        },
      },
    }),
    prisma.submission.count({
      where: {
        status: "completed",
      },
    }),
    prisma.submission.count({
      where: {
        status: "failed",
      },
    }),
    prisma.submission.count({
      where: {
        status: "pending",
      },
    }),
    prisma.class.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    }),
    prisma.assignment.findMany({
      take: 5,
      orderBy: {
        deadline: "asc",
      },
      include: {
        classes: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    }),
    prisma.submission.findMany({
      take: 5,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        assignment: {
          select: {
            title: true,
          },
        },
        student: {
          select: {
            name: true,
            studentId: true,
          },
        },
      },
    }),
  ]);

  const cards = [
    {
      title: "班级总数",
      value: classCount,
      description: `已录入 ${studentCount} 名学生`,
      icon: GraduationCap,
    },
    {
      title: "作业总数",
      value: assignmentCount,
      description: `${activeAssignmentCount} 个进行中，${overdueAssignmentCount} 个逾期未关闭`,
      icon: BookMarked,
    },
    {
      title: "提交总数",
      value: submissionCount,
      description: `${completedSubmissionCount} 条通过，${failedSubmissionCount} 条退回`,
      icon: FileUp,
    },
    {
      title: "待审核提交",
      value: pendingSubmissionCount,
      description: "可在提交列表中继续跟进",
      icon: ClipboardCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">统计面板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看班级、作业和提交状态的整体概览。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className="text-3xl font-bold">{card.value}</div>
              </div>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>近期作业</CardTitle>
            <CardDescription>按截止时间排序，优先展示最需要跟进的任务。</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                还没有创建作业
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作业</TableHead>
                    <TableHead>班级</TableHead>
                    <TableHead>截止时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAssignments.map((assignment) => {
                    const status = getAssignmentStatus(assignment.status, assignment.deadline);

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell>
                          {assignment.classes.length > 0
                            ? assignment.classes.map((item) => item.name).join("、")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {assignment.deadline.toLocaleString("zh-CN")}
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近提交</CardTitle>
            <CardDescription>便于快速看到最近有变化的提交记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                还没有提交记录
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>作业</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.student.name} ({submission.student.studentId})
                      </TableCell>
                      <TableCell>{submission.assignment.title}</TableCell>
                      <TableCell>{getSubmissionStatusLabel(submission.status)}</TableCell>
                      <TableCell>
                        {submission.updatedAt.toLocaleString("zh-CN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最新班级</CardTitle>
          <CardDescription>快速查看最近创建的班级和学生规模。</CardDescription>
        </CardHeader>
        <CardContent>
          {recentClasses.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              还没有班级数据
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentClasses.map((classItem) => (
                <div key={classItem.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{classItem.name}</div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {classItem.description || "暂无班级描述"}
                  </div>
                  <div className="mt-3 text-sm">
                    学生人数：{classItem._count.students}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
