import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { adminRouter } from "./routes/admin";
import { mercadoPagoRouter } from "./routes/mercadoPago";
import { whatsappRouter } from "./routes/whatsapp";

const app = express();

app.use(morgan("tiny"));
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/webhooks/whatsapp", whatsappRouter);
app.use("/webhooks/mercadopago", mercadoPagoRouter);
app.use("/api/admin", adminRouter);

export { app };
