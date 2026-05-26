import { Router } from "express";
import { db, replacementRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

function formatRecord(r: any) {
  return {
    id: r.id,
    filterId: r.filterId,
    filterName: r.filterName,
    cartridgeId: r.cartridgeId,
    cartridgeName: r.cartridgeName,
    stageNumber: r.stageNumber,
    replacedAt: r.replacedAt,
    notes: r.notes ?? null,
  };
}

router.get("/:filterId/history", async (req, res) => {
  const filterId = parseInt(req.params.filterId, 10);
  if (isNaN(filterId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const records = await db.select().from(replacementRecordsTable)
    .where(eq(replacementRecordsTable.filterId, filterId))
    .orderBy(desc(replacementRecordsTable.createdAt));
  res.json(records.map(formatRecord));
});

router.get("/", async (_req, res) => {
  const records = await db.select().from(replacementRecordsTable)
    .orderBy(desc(replacementRecordsTable.createdAt));
  res.json(records.map(formatRecord));
});

export default router;
