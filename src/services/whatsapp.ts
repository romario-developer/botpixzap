import axios from "axios";
import { appConfig } from "../config/env";

const whatsappUrl = `https://graph.facebook.com/v20.0/${appConfig.wa.phoneNumberId}/messages`;

export async function sendText(to: string, text: string): Promise<void> {
  await axios.post(
    whatsappUrl,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: text,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${appConfig.wa.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
}
