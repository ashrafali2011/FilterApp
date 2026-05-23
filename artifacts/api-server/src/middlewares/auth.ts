import { Request, Response, NextFunction } from "express";
import { getUserIdFromToken } from "../routes/auth";

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const userId = getUserIdFromToken(token);
    (req as any).userId = userId;
  } else {
    (req as any).userId = null;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  const expectedPin = process.env.ADMIN_PIN ?? "1234";
  if (!adminToken || adminToken !== expectedPin) {
    res.status(401).json({ error: "Admin access required" });
    return;
  }
  next();
}
