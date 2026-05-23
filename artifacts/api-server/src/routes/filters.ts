import { Router } from "express";
import { db, filtersTable, cartridgesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateFilterBody, UpdateFilterBody, GetFilterParams, UpdateFilterParams, DeleteFilterParams } from "@workspace/api-zod";
import { optionalAuth } from "../middlewares/auth";

const router = Router();

function calcCartridgeStatus(lastReplacedDate: string | null, intervalDays: number): { status: string; nextReplacementDate: string | null; daysRemaining: number | null } {
  if (!lastReplacedDate) {
    return { status: "healthy", nextReplacementDate: null, daysRemaining: null };
  }
  const last = new Date(lastReplacedDate);
  const next = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();
  const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  let status = "healthy";
  if (daysRemaining <= 0) status = "overdue";
  else if (daysRemaining <= 10) status = "warning";
  return { status, nextReplacementDate: next.toISOString().split("T")[0], daysRemaining };
}

function calcFilterStatus(cartridgeStatuses: string[]): string {
  if (cartridgeStatuses.includes("overdue")) return "overdue";
  if (cartridgeStatuses.includes("warning")) return "warning";
  return "healthy";
}

function formatCartridge(c: any) {
  const { status, nextReplacementDate, daysRemaining } = calcCartridgeStatus(c.lastReplacedDate, c.intervalDays);
  return {
    id: c.id,
    filterId: c.filterId,
    name: c.name,
    stageNumber: c.stageNumber,
    lastReplacedDate: c.lastReplacedDate ?? null,
    intervalDays: c.intervalDays,
    nextReplacementDate: c.nextReplacementDate ?? nextReplacementDate,
    status: c.status,
    daysRemaining,
  };
}

router.use(optionalAuth);

router.get("/summary", async (req, res) => {
  const userId = (req as any).userId as number | null;
  let filtersQuery = db.select().from(filtersTable);
  const filters = userId
    ? await db.select().from(filtersTable).where(eq(filtersTable.userId, userId))
    : await db.select().from(filtersTable);

  const totals = { total: 0, healthy: 0, warning: 0, overdue: 0, totalCartridges: 0, overdueCartridges: 0 };
  totals.total = filters.length;

  for (const f of filters) {
    const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, f.id));
    totals.totalCartridges += cartridges.length;
    for (const c of cartridges) {
      if (c.status === "overdue") totals.overdueCartridges++;
    }
    if (f.status === "healthy") totals.healthy++;
    else if (f.status === "warning") totals.warning++;
    else if (f.status === "overdue") totals.overdue++;
  }

  res.json(totals);
});

router.get("/upcoming", async (req, res) => {
  const withinDays = parseInt(String(req.query.withinDays ?? "30"), 10);
  const userId = (req as any).userId as number | null;

  const filters = userId
    ? await db.select().from(filtersTable).where(eq(filtersTable.userId, userId))
    : await db.select().from(filtersTable);

  const results: any[] = [];
  const now = new Date();

  for (const f of filters) {
    const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, f.id));
    for (const c of cartridges) {
      const { status, nextReplacementDate, daysRemaining } = calcCartridgeStatus(c.lastReplacedDate, c.intervalDays);
      if (daysRemaining !== null && daysRemaining <= withinDays) {
        results.push({
          filterId: f.id,
          filterName: f.name,
          cartridgeId: c.id,
          cartridgeName: c.name,
          stageNumber: c.stageNumber,
          nextReplacementDate: nextReplacementDate ?? "",
          daysRemaining,
          status,
        });
      }
    }
  }

  results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  res.json(results);
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as number | null;
  const filters = userId
    ? await db.select().from(filtersTable).where(eq(filtersTable.userId, userId))
    : await db.select().from(filtersTable);

  const results = [];
  for (const f of filters) {
    const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, f.id));
    const formattedCartridges = cartridges.map(formatCartridge);
    const filterStatus = calcFilterStatus(formattedCartridges.map(c => c.status));
    if (filterStatus !== f.status) {
      await db.update(filtersTable).set({ status: filterStatus }).where(eq(filtersTable.id, f.id));
    }
    results.push({
      ...f,
      status: filterStatus,
      cartridges: formattedCartridges,
    });
  }

  res.json(results);
});

router.post("/", async (req, res) => {
  const parsed = CreateFilterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, location, templateType, installationDate, notes, userId } = parsed.data;
  const effectiveUserId = userId ?? ((req as any).userId as number | null) ?? null;

  const [filter] = await db.insert(filtersTable).values({
    name,
    location: location ?? null,
    templateType: templateType ?? "custom",
    installationDate: installationDate ?? null,
    notes: notes ?? null,
    status: "healthy",
    userId: effectiveUserId,
  }).returning();

  res.status(201).json({
    ...filter,
    cartridges: [],
  });
});

router.get("/:filterId", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [filter] = await db.select().from(filtersTable).where(eq(filtersTable.id, filterId));
  if (!filter) { res.status(404).json({ error: "Not found" }); return; }

  const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));
  const formattedCartridges = cartridges.map(formatCartridge);
  const filterStatus = calcFilterStatus(formattedCartridges.map(c => c.status));

  if (filterStatus !== filter.status) {
    await db.update(filtersTable).set({ status: filterStatus }).where(eq(filtersTable.id, filterId));
  }

  res.json({ ...filter, status: filterStatus, cartridges: formattedCartridges });
});

router.patch("/:filterId", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateFilterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [filter] = await db.update(filtersTable)
    .set(parsed.data)
    .where(eq(filtersTable.id, filterId))
    .returning();

  if (!filter) { res.status(404).json({ error: "Not found" }); return; }

  const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));
  res.json({ ...filter, cartridges: cartridges.map(formatCartridge) });
});

router.delete("/:filterId", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));
  await db.delete(filtersTable).where(eq(filtersTable.id, filterId));
  res.status(204).send();
});

export { calcCartridgeStatus, calcFilterStatus };
export default router;
