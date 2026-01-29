import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config/env";

declare module "express-serve-static-core" {
  interface Request {
    admin?: { role: string };
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): Response | void {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const payload = jwt.verify(token, appConfig.admin.jwtSecret);
    req.admin = payload as { role: string };
    return next();
  } catch (error) {
    return res.sendStatus(401);
  }
}
