import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error("请先在环境变量中设置 ADMIN_USERNAME 和 ADMIN_PASSWORD");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: {
      username,
    },
    create: {
      username,
      password: hashedPassword,
    },
    update: {
      password: hashedPassword,
    },
  });

  console.log(`管理员账号已就绪: ${admin.username}`);
}

main()
  .catch((error) => {
    console.error("初始化管理员失败:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
