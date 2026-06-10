import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { optionalAuth } from "../middlewares/auth";

const router = Router();
router.use(optionalAuth);

function parseSettings(s: any) {
  return {
    id: s.id,
    userId: s.userId ?? null,
    reminderDays: s.reminderDays.split(",").map(Number).filter((n: number) => !isNaN(n)),
    notificationsEnabled: s.notificationsEnabled,
    language: s.language,
    theme: s.theme,
    themeColor: s.themeColor,
  };
}

const DEFAULT_SETTINGS_ID = 1;

router.get("/", async (req, res) => {
  const userId = (req as any).userId as number | null;

  let settings;
  if (userId) {
    const [s] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
    if (!s) {
      const [created] = await db.insert(settingsTable).values({
        userId,
        reminderDays: "7,10,20",
        notificationsEnabled: true,
        language: "en",
        theme: "system",
        themeColor: "#0ea5e9",
      }).returning();
      settings = created;
    } else {
      settings = s;
    }
  } else {
    const [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, DEFAULT_SETTINGS_ID));
    if (!s) {
      const [created] = await db.insert(settingsTable).values({
        reminderDays: "7,10,20",
        notificationsEnabled: true,
        language: "en",
        theme: "system",
        themeColor: "#0ea5e9",
      }).returning();
      settings = created;
    } else {
      settings = s;
    }
  }

  res.json(parseSettings(settings));
});

router.patch("/", async (req, res) => {
  const userId = (req as any).userId as number | null;
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const update: Record<string, any> = {};
  if (parsed.data.reminderDays !== undefined) update.reminderDays = parsed.data.reminderDays.join(",");
  if (parsed.data.notificationsEnabled !== undefined) update.notificationsEnabled = parsed.data.notificationsEnabled;
  if (parsed.data.language !== undefined) update.language = parsed.data.language;
  if (parsed.data.theme !== undefined) update.theme = parsed.data.theme;
  if (parsed.data.themeColor !== undefined) update.themeColor = parsed.data.themeColor;

  let settings;
  if (userId) {
    let [existing] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
    if (!existing) {
      const [created] = await db.insert(settingsTable).values({
        userId,
        reminderDays: "7,10,20",
        notificationsEnabled: true,
        language: "en",
        theme: "system",
        themeColor: "#0ea5e9",
        ...update,
      }).returning();
      settings = created;
    } else {
      const [updated] = await db.update(settingsTable).set(update).where(eq(settingsTable.userId, userId)).returning();
      settings = updated;
    }
  } else {
    const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, DEFAULT_SETTINGS_ID));
    if (existing) {
      const [updated] = await db.update(settingsTable).set(update).where(eq(settingsTable.id, DEFAULT_SETTINGS_ID)).returning();
      settings = updated;
    } else {
      const [created] = await db.insert(settingsTable).values({
        reminderDays: "7,10,20",
        notificationsEnabled: true,
        language: "en",
        theme: "system",
        themeColor: "#0ea5e9",
        ...update,
      }).returning();
      settings = created;
    }
  }

  res.json(parseSettings(settings));
});

export default router;
