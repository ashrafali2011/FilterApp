import { Router } from "express";
import { db, cartridgesTable, filtersTable, replacementRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateCartridgeBody, UpdateCartridgeBody, ReplaceCartridgeBody, ReplaceAllCartridgesBody } from "@workspace/api-zod";
import { calcCartridgeStatus, calcFilterStatus } from "./filters";

const router = Router({ mergeParams: true });

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

async function refreshFilterStatus(filterId: number) {
  const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));
  const statuses = cartridges.map(c => c.status);
  const filterStatus = calcFilterStatus(statuses);
  await db.update(filtersTable).set({ status: filterStatus }).where(eq(filtersTable.id, filterId));
}

router.get("/", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));
  res.json(cartridges.map(formatCartridge));
});

router.post("/", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CreateCartridgeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { name, stageNumber, intervalDays, lastReplacedDate } = parsed.data;
  const { status, nextReplacementDate } = calcCartridgeStatus(lastReplacedDate ?? null, intervalDays);

  const [cartridge] = await db.insert(cartridgesTable).values({
    filterId,
    name,
    stageNumber,
    intervalDays,
    lastReplacedDate: lastReplacedDate ?? null,
    nextReplacementDate: nextReplacementDate ?? null,
    status,
  }).returning();

  await refreshFilterStatus(filterId);
  res.status(201).json(formatCartridge(cartridge));
});

router.patch("/:cartridgeId", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  const cartridgeId = parseInt(req.params.cartridgeId, 10);
  if (isNaN(filterId) || isNaN(cartridgeId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateCartridgeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const existing = await db.select().from(cartridgesTable)
    .where(and(eq(cartridgesTable.id, cartridgeId), eq(cartridgesTable.filterId, filterId)))
    .limit(1);

  if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }

  const updatedData = { ...parsed.data };
  const newLast = (updatedData as any).lastReplacedDate ?? existing[0].lastReplacedDate;
  const newInterval = (updatedData as any).intervalDays ?? existing[0].intervalDays;
  const { status, nextReplacementDate } = calcCartridgeStatus(newLast, newInterval);
  (updatedData as any).status = status;
  (updatedData as any).nextReplacementDate = nextReplacementDate;

  const [cartridge] = await db.update(cartridgesTable)
    .set(updatedData)
    .where(and(eq(cartridgesTable.id, cartridgeId), eq(cartridgesTable.filterId, filterId)))
    .returning();

  await refreshFilterStatus(filterId);
  res.json(formatCartridge(cartridge));
});

router.delete("/:cartridgeId", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  const cartridgeId = parseInt(req.params.cartridgeId, 10);
  if (isNaN(filterId) || isNaN(cartridgeId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(cartridgesTable)
    .where(and(eq(cartridgesTable.id, cartridgeId), eq(cartridgesTable.filterId, filterId)));
  await refreshFilterStatus(filterId);
  res.status(204).send();
});

router.post("/:cartridgeId/replace", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  const cartridgeId = parseInt(req.params.cartridgeId, 10);
  if (isNaN(filterId) || isNaN(cartridgeId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = ReplaceCartridgeBody.safeParse(req.body ?? {});
  const replacedAt = parsed.success && parsed.data.replacedAt ? parsed.data.replacedAt : new Date().toISOString().split("T")[0];
  const notes = parsed.success ? (parsed.data.notes ?? null) : null;

  const [existing] = await db.select().from(cartridgesTable)
    .where(and(eq(cartridgesTable.id, cartridgeId), eq(cartridgesTable.filterId, filterId)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [filter] = await db.select().from(filtersTable).where(eq(filtersTable.id, filterId));

  const { status, nextReplacementDate } = calcCartridgeStatus(replacedAt, existing.intervalDays);

  const [cartridge] = await db.update(cartridgesTable)
    .set({ lastReplacedDate: replacedAt, nextReplacementDate: nextReplacementDate ?? null, status })
    .where(eq(cartridgesTable.id, cartridgeId))
    .returning();

  await db.insert(replacementRecordsTable).values({
    filterId,
    filterName: filter?.name ?? "Unknown",
    cartridgeId,
    cartridgeName: existing.name,
    stageNumber: existing.stageNumber,
    replacedAt,
    notes,
  });

  await refreshFilterStatus(filterId);
  res.json(formatCartridge(cartridge));
});

export default router;
