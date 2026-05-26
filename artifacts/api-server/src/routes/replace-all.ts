import { Router } from "express";
import { db, cartridgesTable, filtersTable, replacementRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ReplaceAllCartridgesBody } from "@workspace/api-zod";
import { calcCartridgeStatus, calcFilterStatus } from "./filters";

const router = Router({ mergeParams: true });

function formatCartridge(c: any) {
  const { daysRemaining } = calcCartridgeStatus(c.lastReplacedDate, c.intervalDays);
  return {
    id: c.id,
    filterId: c.filterId,
    name: c.name,
    stageNumber: c.stageNumber,
    lastReplacedDate: c.lastReplacedDate ?? null,
    intervalDays: c.intervalDays,
    nextReplacementDate: c.nextReplacementDate ?? null,
    status: c.status,
    daysRemaining,
  };
}

router.post("/", async (req, res) => {
  const filterId = parseInt(String((req.params as any).filterId), 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = ReplaceAllCartridgesBody.safeParse(req.body ?? {});
  const replacedAt = parsed.success && parsed.data.replacedAt ? parsed.data.replacedAt : new Date().toISOString().split("T")[0];
  const notes = parsed.success ? (parsed.data.notes ?? null) : null;

  const [filter] = await db.select().from(filtersTable).where(eq(filtersTable.id, filterId));
  if (!filter) { res.status(404).json({ error: "Filter not found" }); return; }

  const cartridges = await db.select().from(cartridgesTable).where(eq(cartridgesTable.filterId, filterId));

  const updated = [];
  for (const c of cartridges) {
    const { status, nextReplacementDate } = calcCartridgeStatus(replacedAt, c.intervalDays);
    const [updatedCartridge] = await db.update(cartridgesTable)
      .set({ lastReplacedDate: replacedAt, nextReplacementDate: nextReplacementDate ?? null, status })
      .where(eq(cartridgesTable.id, c.id))
      .returning();

    await db.insert(replacementRecordsTable).values({
      filterId,
      filterName: filter.name,
      cartridgeId: c.id,
      cartridgeName: c.name,
      stageNumber: c.stageNumber,
      replacedAt,
      notes,
    });

    updated.push(updatedCartridge);
  }

  const statuses = updated.map(c => c.status);
  const filterStatus = calcFilterStatus(statuses);
  await db.update(filtersTable).set({ status: filterStatus }).where(eq(filtersTable.id, filterId));

  res.json(updated.map(formatCartridge));
});

export default router;
