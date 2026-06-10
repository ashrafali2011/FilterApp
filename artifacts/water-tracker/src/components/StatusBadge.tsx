import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Props {
  status: "healthy" | "warning" | "overdue" | string;
  className?: string;
}

const labels: Record<string, { en: string; ar: string }> = {
  healthy: { en: "Healthy", ar: "جيد" },
  warning: { en: "Due Soon", ar: "قريباً" },
  overdue: { en: "Overdue", ar: "متأخر" },
};

const styles: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
};

const dots: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  overdue: "bg-red-500",
};

export default function StatusBadge({ status, className }: Props) {
  const { language } = useI18n();
  const label = labels[status] ?? { en: status, ar: status };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dots[status] ?? "bg-muted-foreground")} />
      {language === "ar" ? label.ar : label.en}
    </span>
  );
}
