import fs from "fs/promises";
import path from "path";

/**
 * [FIL-01] 附件清理入口
 *
 * 设计意图：
 * - 提交附件虽然保存在本地文件系统，但生命周期必须跟业务对象同步。
 * - 删除班级、学生、作业或覆盖提交时，都通过这个入口收口，避免磁盘残留“孤儿文件”。
 *
 * 文档映射：
 * - docs/deployment-and-maintenance-guide.md
 * - docs/security-and-permission-design.md
 * - docs/test-and-acceptance-specification.md
 */
export async function removeStoredFile(fileUrl?: string | null) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) {
    return;
  }

  const normalizedPath = fileUrl.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", normalizedPath);

  try {
    await fs.unlink(filePath);
  } catch (_error) {
    return;
  }
}

// 批量清理用于班级/作业删除这类聚合操作，避免每个接口重复写循环逻辑。
export async function removeStoredFiles(fileUrls: Array<string | null | undefined>) {
  await Promise.all(fileUrls.map((fileUrl) => removeStoredFile(fileUrl)));
}
