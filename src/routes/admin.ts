import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config/env";
import { adminAuth } from "../middleware/adminAuth";
import { getMenuDateString } from "../lib/dates";

const router = Router();

const loginBodySchema = z.object({
  password: z.string().min(1),
});

router.post("/login", (req, res) => {
  const parseResult = loginBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Senha inválida" });
  }

  if (parseResult.data.password !== appConfig.admin.password) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const token = jwt.sign({ role: "admin" }, appConfig.admin.jwtSecret, {
    expiresIn: "8h",
  });

  return res.json({ token });
});

router.use(adminAuth);

router.get("/summary/today", async (req, res) => {
  const menuDate = getMenuDateString();
  const baseWhere = { menu: { date: menuDate } };

  const [totalOrders, paidOrders, pendingOrders, paidAmount, paidOption1, paidOption2] =
    await Promise.all([
      prisma.order.count({ where: baseWhere }),
      prisma.order.count({ where: { ...baseWhere, status: "PAID" } }),
      prisma.order.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.order.aggregate({
        where: { ...baseWhere, status: "PAID" },
        _sum: { amountCents: true },
      }),
      prisma.order.count({ where: { ...baseWhere, status: "PAID", option: 1 } }),
      prisma.order.count({ where: { ...baseWhere, status: "PAID", option: 2 } }),
    ]);

  return res.json({
    totalOrders,
    paidOrders,
    pendingOrders,
    totalPaidAmountCents: paidAmount._sum.amountCents ?? 0,
    paidByOption: {
      option1Count: paidOption1,
      option2Count: paidOption2,
    },
  });
});

router.get("/menu/today", async (req, res) => {
  const menuDate = getMenuDateString();
  const menu = await prisma.menu.findUnique({
    where: { date: menuDate },
  });

  if (!menu) {
    return res.status(404).json({ message: "Menu não encontrado" });
  }

  return res.json({
    priceCents: menu.priceCents,
    deliveryFeeCents: menu.deliveryFeeCents,
  });
});

const menuUpdateSchema = z.object({
  priceCents: z.number().int().nonnegative(),
  deliveryFeeCents: z.number().int().nonnegative(),
});

router.put("/menu/today", async (req, res) => {
  const parsed = menuUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const menuDate = getMenuDateString();
  const menu = await prisma.menu.findUnique({
    where: { date: menuDate },
  });

  if (!menu) {
    return res.status(404).json({ message: "Menu não encontrado" });
  }

  const updated = await prisma.menu.update({
    where: { id: menu.id },
    data: {
      priceCents: parsed.data.priceCents,
      deliveryFeeCents: parsed.data.deliveryFeeCents,
    },
  });

  return res.json({
    priceCents: updated.priceCents,
    deliveryFeeCents: updated.deliveryFeeCents,
  });
});

export const adminRouter = router;
