import { Router } from "express";
import { db, usersTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

export async function seedAdminUser() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, "Admin")).limit(1);
  if (existing.length > 0) return;
  const password = process.env.ADMIN_PIN ?? "1234";
  const [user] = await db.insert(usersTable).values({
    username: "Admin",
    passwordHash: createHash("sha256").update(password + (process.env.SESSION_SECRET ?? "salt")).digest("hex"),
  }).returning();
  await db.insert(settingsTable).values({
    userId: user.id,
    reminderDays: "7,10,20",
    notificationsEnabled: true,
    language: "en",
    theme: "system",
    themeColor: "#0ea5e9",
  }).onConflictDoNothing();
}

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + process.env.SESSION_SECRET ?? "salt").digest("hex");
}

function makeToken(userId: number): string {
  const payload = `${userId}:${Date.now()}:${process.env.SESSION_SECRET ?? "salt"}`;
  return createHash("sha256").update(payload).digest("hex") + "." + Buffer.from(String(userId)).toString("base64");
}

function getUserIdFromToken(token: string): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const userId = parseInt(Buffer.from(parts[1], "base64").toString("utf-8"), 10);
    if (isNaN(userId)) return null;
    return userId;
  } catch {
    return null;
  }
}

export { getUserIdFromToken };

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;

  if (username.toLowerCase() === "admin") {
    res.status(400).json({ error: "Username not allowed" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash: hashPassword(password),
  }).returning();

  await db.insert(settingsTable).values({
    userId: user.id,
    reminderDays: "7,10,20",
    notificationsEnabled: true,
    language: "en",
    theme: "system",
    themeColor: "#0ea5e9",
  }).onConflictDoNothing();

  const token = makeToken(user.id);
  res.status(201).json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken(user.id);
  res.json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = auth.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, username: user.username, createdAt: user.createdAt.toISOString() });
});

export default router;
