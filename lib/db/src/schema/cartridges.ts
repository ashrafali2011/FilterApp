import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartridgesTable = pgTable("cartridges", {
  id: serial("id").primaryKey(),
  filterId: integer("filter_id").notNull(),
  name: text("name").notNull(),
  stageNumber: integer("stage_number").notNull(),
  lastReplacedDate: text("last_replaced_date"),
  intervalDays: integer("interval_days").notNull().default(90),
  nextReplacementDate: text("next_replacement_date"),
  status: text("status").notNull().default("healthy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCartridgeSchema = createInsertSchema(cartridgesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCartridge = z.infer<typeof insertCartridgeSchema>;
export type Cartridge = typeof cartridgesTable.$inferSelect;
