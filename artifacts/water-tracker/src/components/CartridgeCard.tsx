import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RefreshCw, Clock, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Cartridge {
  id: number;
  filterId: number;
  name: string;
  stageNumber: number;
  lastReplacedDate: string | null;
  intervalDays: number;
  nextReplacementDate: string | null;
  status: string;
  daysRemaining: number | null;
}

interface Props {
  cartridge: Cartridge;
  onReplace: (cartridgeId: number, replacedAt: string, notes?: string) => void;
}

export default function CartridgeCard({ cartridge, onReplace }: Props) {
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;
  const [open, setOpen] = useState(false);
  const [replacedAt, setReplacedAt] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const statusColor = {
    healthy: "border-emerald-200 dark:border-emerald-800/50",
    warning: "border-amber-200 dark:border-amber-800/50",
    overdue: "border-red-200 dark:border-red-800/50",
  }[cartridge.status] ?? "border-border";

  const progressColor = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    overdue: "bg-red-500",
  }[cartridge.status] ?? "bg-primary";

  const getProgress = () => {
    if (cartridge.daysRemaining === null) return 100;
    if (cartridge.daysRemaining <= 0) return 0;
    return Math.min(100, Math.round((cartridge.daysRemaining / cartridge.intervalDays) * 100));
  };

  const handleReplace = () => {
    onReplace(cartridge.id, replacedAt, notes || undefined);
    setOpen(false);
    setNotes("");
    setReplacedAt(new Date().toISOString().split("T")[0]);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-card border rounded-xl p-4 flex flex-col gap-3",
          statusColor
        )}
        data-testid={`card-cartridge-${cartridge.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">
              {t(`Stage ${cartridge.stageNumber}`, `المرحلة ${cartridge.stageNumber}`)}
            </div>
            <div className="font-semibold text-sm text-foreground">{cartridge.name}</div>
          </div>
          <StatusBadge status={cartridge.status as any} />
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {cartridge.daysRemaining !== null
                ? cartridge.daysRemaining <= 0
                  ? t(`${Math.abs(cartridge.daysRemaining)}d overdue`, `متأخر ${Math.abs(cartridge.daysRemaining)} يوم`)
                  : t(`${cartridge.daysRemaining}d remaining`, `${cartridge.daysRemaining} يوم متبقي`)
                : t("Never replaced", "لم يستبدل بعد")}
            </span>
            <span>{cartridge.intervalDays}d {t("interval", "دورة")}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", progressColor)}
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {cartridge.nextReplacementDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {t("Next:", "التالي:")} {format(parseISO(cartridge.nextReplacementDate), "MMM d, yyyy")}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs gap-1.5 mt-auto"
          onClick={() => setOpen(true)}
          data-testid={`button-replace-cartridge-${cartridge.id}`}
        >
          <RefreshCw className="w-3 h-3" />
          {t("Mark as Replaced", "تم الاستبدال")}
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Replace Cartridge", "استبدال الفلتر")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">{cartridge.name}</div>
            <div className="space-y-2">
              <Label htmlFor="replaced-at">{t("Replacement Date", "تاريخ الاستبدال")}</Label>
              <Input
                id="replaced-at"
                type="date"
                value={replacedAt}
                onChange={e => setReplacedAt(e.target.value)}
                data-testid="input-replaced-at"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-notes">{t("Notes (optional)", "ملاحظات (اختياري)")}</Label>
              <Input
                id="replace-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t("Any notes about the replacement...", "أي ملاحظات عن الاستبدال...")}
                data-testid="input-replace-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={handleReplace} data-testid="button-confirm-replace">
              <RefreshCw className="w-4 h-4 me-2" />
              {t("Confirm", "تأكيد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
