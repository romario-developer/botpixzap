import axios from "axios";
import { randomUUID } from "crypto";
import { appConfig } from "../config/env";

const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";

export interface MercadoPagoPixResponse {
  mpPaymentId: string;
  copyPaste: string;
  qrBase64?: string | null;
  status: string;
  rawWebhook: unknown;
}

export interface MercadoPagoPaymentDetails {
  id: string;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
  [key: string]: unknown;
}

export async function createMercadoPagoPix(
  orderId: number,
  amountCents: number,
  description: string,
  payerEmail: string
): Promise<MercadoPagoPixResponse> {
  const response = await axios.post(
    MP_PAYMENTS_URL,
    {
      transaction_amount: Number((amountCents / 100).toFixed(2)),
      payment_method_id: "pix",
      description,
      external_reference: `order-${orderId}`,
      payer: {
        email: payerEmail,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${appConfig.mp.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
    }
  );

  const data = response.data;
  const transactionData = data?.point_of_interaction?.transaction_data;
  const copyPaste = transactionData?.qr_code;
  if (!copyPaste) {
    throw new Error("Mercado Pago PIX response missing copia e cola.");
  }

  return {
    mpPaymentId: String(data.id ?? ""),
    status: data.status ?? "pending",
    copyPaste,
    qrBase64: transactionData?.qr_code_base64 ?? null,
    rawWebhook: data,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentDetails> {
  const response = await axios.get(`${MP_PAYMENTS_URL}/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${appConfig.mp.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response.data as MercadoPagoPaymentDetails;
}
