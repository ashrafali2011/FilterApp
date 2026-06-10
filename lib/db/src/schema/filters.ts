import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filtersTable = pgTable("filters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  location: text("location"),
  templateType: text("template_type").notNull().default("custom"),
  installationDate: text("installation_date"),
  notes: text("notes"),
  status: text("status").notNull().default("healthy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilterSchema = createInsertSchema(filtersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFilter = z.infer<typeof insertFilterSchema>;
export type Filter = typeof filtersTable.$inferSelect;
