import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendText } from "../services/whatsapp";
import { fetchMercadoPagoPayment } from "../services/mercadoPago";

const router = Router();

function parsePaymentId(candidate: unknown): string | null {
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  if (typeof candidate === "number") {
    return String(candidate);
  }
  return null;
}

function resolvePaymentId(body: unknown): string | null {
  const payload = (body ?? {}) as Record<string, unknown>;
  const data = payload["data"] as Record<string, unknown> | undefined;
  const resource = payload["resource"] as Record<string, unknown> | undefined;

  return (
    parsePaymentId(data?.["id"]) ??
    parsePaymentId(payload["id"]) ??
    parsePaymentId(resource?.["id"])
  );
}

router.post("/", async (req, res) => {
  const paymentId = resolvePaymentId(req.body);
  if (!paymentId) {
    return res.status(400).send("payment id missing");
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId);
    const order = await prisma.order.findFirst({
      where: { mpPaymentId: paymentId },
      include: {
        customer: true,
        pixCharge: true,
      },
    });

    if (!order) {
      return res.sendStatus(200);
    }

    const orderStatus = payment.status === "approved" ? "PAID" : "PENDING";
    await prisma.order.update({
      where: { id: order.id },
      data: { status: orderStatus },
    });

    const rawWebhook = payment as Prisma.InputJsonValue;
    if (order.pixCharge) {
      await prisma.pixCharge.update({
        where: { orderId: order.id },
        data: {
          status: payment.status,
          rawWebhook,
        },
      });
    }

    if (payment.status === "approved" && order.customer?.waPhone) {
      await sendText(order.customer.waPhone, "PAGAMENTO CONFIRMADO COM SUCESSO ✅");
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("mercado pago webhook error", error);
    return res.sendStatus(500);
  }
});

export const mercadoPagoRouter = router;
