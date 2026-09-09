import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedPermissions } from "./permissions.seed";
import { seedRoles } from "./roles.seed";
import { seedCategories } from "./categories.seed";

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[seed:admin] ADMIN_EMAIL/ADMIN_PASSWORD ausentes — sem admin padrão criado.",
    );
    return;
  }

  const role = await prisma.role.findUnique({
    where: { code: "MANAGER_ADMIN" },
  });
  if (!role) {
    throw new Error(
      "[seed:admin] Perfil MANAGER_ADMIN não encontrado. Execute roles.seed primeiro.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { status: "ATIVO", passwordHash },
    create: {
      email,
      name: "Administrador",
      cargo: "Administrador",
      department: "COMERCIAL",
      roleId: role.id,
      status: "ATIVO",
      passwordHash,
    },
  });
  console.info(`[seed:admin] Admin padrão garantido: ${email}`);
}

async function main(): Promise<void> {
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedCategories(prisma);
  await seedAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("[seed] Falha:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
