import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronRight, MapPin, RefreshCw, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Filter {
  id: number;
  name: string;
  location: string | null;
  templateType: string;
  status: string;
  cartridges: Array<{ status: string; daysRemaining: number | null }>;
  updatedAt: string;
}

interface Props {
  filter: Filter;
  index?: number;
}

const templateLabels: Record<string, string> = {
  single: "Single Stage",
  three_stage: "3-Stage",
  five_stage: "5-Stage",
  seven_stage: "7-Stage",
  custom: "Custom",
};

const statusBorder: Record<string, string> = {
  healthy: "border-emerald-200 dark:border-emerald-800/40",
  warning: "border-amber-200 dark:border-amber-800/40",
  overdue: "border-red-200 dark:border-red-800/40",
};

export default function FilterCard({ filter, index = 0 }: Props) {
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;

  const overdueCount = filter.cartridges.filter(c => c.status === "overdue").length;
  const warningCount = filter.cartridges.filter(c => c.status === "warning").length;
  const nextDue = filter.cartridges
    .filter(c => c.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "bg-card border rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow",
        statusBorder[filter.status] ?? "border-border"
      )}
      data-testid={`card-filter-${filter.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate text-base" data-testid={`text-filter-name-${filter.id}`}>
            {filter.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {templateLabels[filter.templateType] ?? filter.templateType}
            </span>
            {filter.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {filter.location}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={filter.status as any} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{filter.cartridges.length}</div>
          <div className="text-xs text-muted-foreground">{t("Stages", "مراحل")}</div>
        </div>
        <div className={cn("rounded-lg p-2.5 text-center", overdueCount > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-muted/50")}>
          <div className={cn("text-lg font-bold", overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
            {overdueCount}
          </div>
          <div className="text-xs text-muted-foreground">{t("Overdue", "متأخر")}</div>
        </div>
        <div className={cn("rounded-lg p-2.5 text-center", warningCount > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-muted/50")}>
          <div className={cn("text-lg font-bold", warningCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
            {warningCount}
          </div>
          <div className="text-xs text-muted-foreground">{t("Due Soon", "قريباً")}</div>
        </div>
      </div>

      {nextDue && nextDue.daysRemaining !== null && (
        <div className="text-xs text-muted-foreground">
          {nextDue.daysRemaining <= 0
            ? t(`Next service overdue by ${Math.abs(nextDue.daysRemaining)} days`, `المتابعة التالية تأخرت ${Math.abs(nextDue.daysRemaining)} يوم`)
            : t(`Next service in ${nextDue.daysRemaining} days`, `المتابعة التالية بعد ${nextDue.daysRemaining} يوم`)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link href={`/filters/${filter.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" data-testid={`button-view-filter-${filter.id}`}>
            <Eye className="w-3.5 h-3.5" />
            {t("View", "عرض")}
          </Button>
        </Link>
        <Link href={`/filters/${filter.id}`} className="flex-1">
          <Button size="sm" className="w-full gap-1.5 text-xs" data-testid={`button-replace-filter-${filter.id}`}>
            <RefreshCw className="w-3.5 h-3.5" />
            {t("Replace", "استبدال")}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
