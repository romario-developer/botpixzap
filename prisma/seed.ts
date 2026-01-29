import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function todayBahiaISODate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date());
}

async function main() {
  const today = todayBahiaISODate();
  await prisma.menu.upsert({
    where: { date: today },
    update: {
      priceCents: 1500,
      deliveryFeeCents: 300,
    },
    create: {
      date: today,
      priceCents: 1500,
      deliveryFeeCents: 300,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
