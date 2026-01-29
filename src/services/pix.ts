import { Order, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createMercadoPagoPix } from "./mercadoPago";

export async function createPixCharge(
  order: Order,
  description: string,
  payerEmail: string
): Promise<{ copyPaste: string }> {
  const mpResponse = await createMercadoPagoPix(order.id, order.amountCents, description, payerEmail);

  await prisma.order.update({
    where: { id: order.id },
    data: { mpPaymentId: mpResponse.mpPaymentId },
  });

  await prisma.pixCharge.create({
    data: {
      orderId: order.id,
      copyPaste: mpResponse.copyPaste,
      qrBase64: mpResponse.qrBase64,
      status: mpResponse.status,
      rawWebhook: mpResponse.rawWebhook as Prisma.InputJsonValue,
    },
  });

  return { copyPaste: mpResponse.copyPaste };
}
