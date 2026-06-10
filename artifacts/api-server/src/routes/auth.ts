import { Router } from "express";
import { db, usersTable, settingsTable, filtersTable, cartridgesTable, passwordResetOtpsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createHash, randomInt } from "crypto";
import { RegisterBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import { sendOtpEmail } from "../lib/email";
import { logger } from "../lib/logger";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export async function seedExampleFilters(userId: number) {
  const examples = [
    {
      filter: {
        name: "Kitchen RO System",
        location: "Kitchen",
        templateType: "5stage",
        notes: "Example filter — overdue for replacement",
        status: "overdue",
      },
      cartridges: [
        { name: "Sediment Filter", stageNumber: 1, intervalDays: 180, lastReplacedDate: daysAgo(210), nextReplacementDate: daysFromNow(-30), status: "overdue" },
        { name: "Carbon Block", stageNumber: 2, intervalDays: 180, lastReplacedDate: daysAgo(195), nextReplacementDate: daysFromNow(-15), status: "overdue" },
        { name: "RO Membrane", stageNumber: 3, intervalDays: 365, lastReplacedDate: daysAgo(400), nextReplacementDate: daysFromNow(-35), status: "overdue" },
        { name: "Post Carbon", stageNumber: 4, intervalDays: 365, lastReplacedDate: daysAgo(380), nextReplacementDate: daysFromNow(-15), status: "overdue" },
        { name: "Alkaline Filter", stageNumber: 5, intervalDays: 180, lastReplacedDate: daysAgo(200), nextReplacementDate: daysFromNow(-20), status: "overdue" },
      ],
    },
    {
      filter: {
        name: "Office Water Cooler",
        location: "Office",
        templateType: "3stage",
        notes: "Example filter — replacement due soon",
        status: "warning",
      },
      cartridges: [
        { name: "PP Sediment", stageNumber: 1, intervalDays: 90, lastReplacedDate: daysAgo(83), nextReplacementDate: daysFromNow(7), status: "warning" },
        { name: "Activated Carbon", stageNumber: 2, intervalDays: 90, lastReplacedDate: daysAgo(82), nextReplacementDate: daysFromNow(8), status: "warning" },
        { name: "UF Membrane", stageNumber: 3, intervalDays: 180, lastReplacedDate: daysAgo(80), nextReplacementDate: daysFromNow(100), status: "healthy" },
      ],
    },
    {
      filter: {
        name: "Bathroom Tap Filter",
        location: "Bathroom",
        templateType: "1stage",
        notes: "Example filter — all cartridges healthy",
        status: "healthy",
      },
      cartridges: [
        { name: "Ceramic Filter", stageNumber: 1, intervalDays: 365, lastReplacedDate: daysAgo(30), nextReplacementDate: daysFromNow(335), status: "healthy" },
      ],
    },
  ];

  for (const { filter, cartridges } of examples) {
    const [f] = await db.insert(filtersTable).values({ ...filter, userId }).returning();
    for (const c of cartridges) {
      await db.insert(cartridgesTable).values({ ...c, filterId: f.id });
    }
  }
}

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
  return createHash("sha256").update(password + (process.env.SESSION_SECRET ?? "salt")).digest("hex");
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp + (process.env.SESSION_SECRET ?? "salt")).digest("hex");
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

// ─── Register ─────────────────────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, email, password } = parsed.data;

  if (username.toLowerCase() === "admin") {
    res.status(400).json({ error: "Username not allowed" });
    return;
  }

  const existingByUsername = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existingByUsername.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const existingByEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existingByEmail.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    username,
    email,
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

  await seedExampleFilters(user.id).catch(() => {});

  const token = makeToken(user.id);
  res.status(201).json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    token,
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

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

// ─── Forgot password (send OTP) ───────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email } = parsed.data;

  // Always respond 200 to avoid leaking which emails are registered
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.json({ message: "If that email is registered, an OTP has been sent." });
    return;
  }

  // Invalidate old OTPs for this user
  await db.delete(passwordResetOtpsTable).where(
    and(eq(passwordResetOtpsTable.userId, user.id), isNull(passwordResetOtpsTable.usedAt))
  );

  // Generate 6-digit OTP
  const otp = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(passwordResetOtpsTable).values({
    userId: user.id,
    otpHash: hashOtp(otp),
    expiresAt,
  });

  await sendOtpEmail(email, otp, user.username).catch(err => {
    logger.error({ err }, "Failed to send OTP email");
  });

  res.json({ message: "If that email is registered, an OTP has been sent." });
});

// ─── Reset password (verify OTP + set new password) ──────────────────────────

router.post("/reset-password", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, otp, newPassword } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  const now = new Date();
  const [record] = await db.select().from(passwordResetOtpsTable).where(
    and(
      eq(passwordResetOtpsTable.userId, user.id),
      eq(passwordResetOtpsTable.otpHash, hashOtp(otp)),
      isNull(passwordResetOtpsTable.usedAt),
      gt(passwordResetOtpsTable.expiresAt, now)
    )
  ).limit(1);

  if (!record) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  // Mark OTP as used + update password
  await db.update(passwordResetOtpsTable)
    .set({ usedAt: now })
    .where(eq(passwordResetOtpsTable.id, record.id));

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Password reset successfully." });
});

// ─── Logout / Me ──────────────────────────────────────────────────────────────

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
