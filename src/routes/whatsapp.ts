import { Router } from "express";
import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config/env";
import { createPixCharge } from "../services/pix";
import { sendText } from "../services/whatsapp";
import { getMenuDateString, getSilentUntil } from "../lib/dates";

const router = Router();

const OPTION_REGEX = /^(?:opcao)?\s*([12])\s*$/;

function normalizePhone(raw?: string): string | null {
  if (!raw) {
    return null;
  }
  const digits = raw.replace(/\D+/g, "");
  return digits || null;
}

function parseChoice(body: string): number | null {
  const normalized = body
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  const match = normalized.match(OPTION_REGEX);
  return match ? Number.parseInt(match[1], 10) : null;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const verifyToken = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && verifyToken === appConfig.wa.verifyToken && challenge) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Forbidden");
});

router.post("/", async (req, res) => {
  try {
    const entry = Array.isArray(req.body.entry) ? req.body.entry[0] : undefined;
    const change = Array.isArray(entry?.changes) ? entry?.changes[0] : undefined;
    const value = change?.value;
    const message = Array.isArray(value?.messages) ? value?.messages[0] : undefined;
    if (!message || message.type !== "text") {
      return res.sendStatus(200);
    }

    const customerPhone = normalizePhone(message.from);
    if (!customerPhone) {
      return res.sendStatus(200);
    }

    const customer = await prisma.customer.findUnique({
      where: { waPhone: customerPhone },
    });

    const now = DateTime.now().setZone(appConfig.timezone);
    if (customer?.silentUntil && customer.silentUntil > now.toJSDate()) {
      return res.sendStatus(200);
    }

    const messageText = message.text?.body;
    if (typeof messageText !== "string") {
      return res.sendStatus(200);
    }

    const choice = parseChoice(messageText);
    if (!choice) {
      return res.sendStatus(200);
    }

    const menuDate = getMenuDateString();
    const menu = await prisma.menu.findUnique({
      where: { date: menuDate },
    });

    if (!menu) {
      await sendText(customerPhone, "Cardápio indisponível no momento.");
      return res.sendStatus(200);
    }

    const amountCents = menu.priceCents + menu.deliveryFeeCents;
    const silentUntil = getSilentUntil();
    const contactName = Array.isArray(value?.contacts)
      ? value?.contacts[0]?.profile?.name
      : undefined;

    if (customer) {
      const recentCutoff = now.minus({ minutes: 2 }).toJSDate();
      const recentOrder = await prisma.order.findFirst({
        where: {
          customerId: customer.id,
          status: "PENDING",
          option: choice,
          createdAt: { gte: recentCutoff },
        },
        include: { pixCharge: true },
        orderBy: { createdAt: "desc" },
      });

      if (recentOrder?.pixCharge) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            ...(contactName ? { waName: contactName } : {}),
            silentUntil,
          },
        });

        const reusedTotal = formatCurrency(recentOrder.amountCents);
        const responseText = `Pedido: Opção ${choice}\nTotal: ${reusedTotal}\n\nPIX Copia e Cola:\n${recentOrder.pixCharge.copyPaste}`;
        await sendText(customerPhone, responseText);
        return res.sendStatus(200);
      }
    }

    const upsertedCustomer = await prisma.customer.upsert({
      where: { waPhone: customerPhone },
      update: {
        ...(contactName ? { waName: contactName } : {}),
      },
      create: {
        waPhone: customerPhone,
        ...(contactName ? { waName: contactName } : {}),
      },
    });

    const order = await prisma.order.create({
      data: {
        customerId: upsertedCustomer.id,
        menuId: menu.id,
        option: choice,
        amountCents,
        status: "PENDING",
      },
    });

    const description = `Pedido BotPixZap - Opção ${choice}`;
    const payerEmail = `${customerPhone}@botpixzap.local`;

    try {
      const { copyPaste } = await createPixCharge(order, description, payerEmail);
      await prisma.customer.update({
        where: { id: upsertedCustomer.id },
        data: { silentUntil },
      });
      const formattedTotal = formatCurrency(amountCents);
      const responseText = `Pedido: Opção ${choice}\nTotal: ${formattedTotal}\n\nPIX Copia e Cola:\n${copyPaste}`;
      await sendText(customerPhone, responseText);
      return res.sendStatus(200);
    } catch (error) {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      console.error("pix creation failed", error);
      await sendText(customerPhone, "Não foi possível gerar o PIX agora. Tente novamente.");
      return res.sendStatus(200);
    }
  } catch (error) {
    console.error("whatsapp webhook error", error);
    return res.sendStatus(500);
  }
});

export const whatsappRouter = router;
