import { Router } from "express";
import { db, bannersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBannerBody, UpdateBannerBody, VerifyAdminPinBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

function formatBanner(b: any) {
  return {
    id: b.id,
    position: b.position,
    imageUrl: b.imageUrl,
    clickUrl: b.clickUrl ?? null,
    enabled: b.enabled,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

router.get("/banners", async (_req, res) => {
  const banners = await db.select().from(bannersTable).where(eq(bannersTable.enabled, true));
  res.json(banners.map(formatBanner));
});

router.post("/admin/verify-pin", async (req, res) => {
  const parsed = VerifyAdminPinBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const expectedPin = process.env.ADMIN_PIN ?? "1234";
  if (parsed.data.pin === expectedPin) {
    res.json({ token: expectedPin, valid: true });
  } else {
    res.status(401).json({ token: "", valid: false });
  }
});

router.get("/admin/banners", requireAdmin, async (_req, res) => {
  const banners = await db.select().from(bannersTable);
  res.json(banners.map(formatBanner));
});

router.post("/admin/banners", requireAdmin, async (req, res) => {
  const parsed = CreateBannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [banner] = await db.insert(bannersTable).values({
    position: parsed.data.position,
    imageUrl: parsed.data.imageUrl,
    clickUrl: parsed.data.clickUrl ?? null,
    enabled: parsed.data.enabled,
  }).returning();

  res.status(201).json(formatBanner(banner));
});

router.patch("/admin/banners/:bannerId", requireAdmin, async (req, res) => {
  const bannerId = parseInt(req.params.bannerId, 10);
  if (isNaN(bannerId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [banner] = await db.update(bannersTable).set(parsed.data).where(eq(bannersTable.id, bannerId)).returning();
  if (!banner) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatBanner(banner));
});

router.delete("/admin/banners/:bannerId", requireAdmin, async (req, res) => {
  const bannerId = parseInt(req.params.bannerId, 10);
  if (isNaN(bannerId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(bannersTable).where(eq(bannersTable.id, bannerId));
  res.status(204).send();
});

export default router;
