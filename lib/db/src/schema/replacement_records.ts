import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const replacementRecordsTable = pgTable("replacement_records", {
  id: serial("id").primaryKey(),
  filterId: integer("filter_id").notNull(),
  filterName: text("filter_name").notNull(),
  cartridgeId: integer("cartridge_id").notNull(),
  cartridgeName: text("cartridge_name").notNull(),
  stageNumber: integer("stage_number").notNull(),
  replacedAt: text("replaced_at").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReplacementRecordSchema = createInsertSchema(replacementRecordsTable).omit({ id: true, createdAt: true });
export type InsertReplacementRecord = z.infer<typeof insertReplacementRecordSchema>;
export type ReplacementRecord = typeof replacementRecordsTable.$inferSelect;
