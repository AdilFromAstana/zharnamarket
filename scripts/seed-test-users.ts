import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  const creator = await prisma.user.upsert({
    where: { email: "creator@test.local" },
    create: {
      name: "Test Creator",
      email: "creator@test.local",
      password: await hash("Creator123!"),
      role: "user",
      emailVerified: true,
    },
    update: { password: await hash("Creator123!"), emailVerified: true },
  });

  const advertiser = await prisma.user.upsert({
    where: { email: "advertiser@test.local" },
    create: {
      name: "Test Advertiser",
      email: "advertiser@test.local",
      password: await hash("Advertiser123!"),
      role: "user",
      emailVerified: true,
    },
    update: { password: await hash("Advertiser123!"), emailVerified: true },
  });

  console.log("✅ Creator    — id:", creator.id, "| email:", creator.email);
  console.log("✅ Advertiser — id:", advertiser.id, "| email:", advertiser.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
