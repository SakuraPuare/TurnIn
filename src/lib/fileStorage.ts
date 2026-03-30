import fs from "fs/promises";
import path from "path";

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

export async function removeStoredFiles(fileUrls: Array<string | null | undefined>) {
  await Promise.all(fileUrls.map((fileUrl) => removeStoredFile(fileUrl)));
}
