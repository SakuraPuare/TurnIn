import { prisma } from "@/lib/prisma";
import { AdminSubmissionsClient } from "@/components/AdminSubmissionsClient";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const [submissions, classes, assignments] = await Promise.all([
    prisma.submission.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            deadline: true,
            requiredFields: {
              select: {
                name: true,
                label: true,
              },
            },
          },
        },
        student: {
          select: {
            name: true,
            studentId: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.class.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.assignment.findMany({
      orderBy: {
        deadline: "asc",
      },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  return (
    <AdminSubmissionsClient
      submissions={submissions.map((submission) => ({
        ...submission,
        status: submission.status as "pending" | "completed" | "failed",
        updatedAt: submission.updatedAt.toISOString(),
        reviewedAt: submission.reviewedAt?.toISOString() || null,
        assignment: {
          ...submission.assignment,
          deadline: submission.assignment.deadline.toISOString(),
        },
      }))}
      classes={classes}
      assignments={assignments}
    />
  );
}
