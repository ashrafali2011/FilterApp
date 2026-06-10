import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useListHistory, getListHistoryQueryKey } from "@workspace/api-client-react";
import { guestGetAllHistory } from "@/lib/guest-storage";
import { History as HistoryIcon, Search, RefreshCw, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function History() {
  const { isAuthenticated, isGuest } = useAuth();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;
  const [search, setSearch] = useState("");
  const [guestHistory, setGuestHistory] = useState<any[]>([]);

  const { data: apiHistory, isLoading } = useListHistory({
    query: { enabled: isAuthenticated, queryKey: getListHistoryQueryKey() }
  });

  useEffect(() => {
    if (isGuest && !isAuthenticated) {
      setGuestHistory(guestGetAllHistory());
    }
  }, [isGuest, isAuthenticated]);

  const history = (isAuthenticated ? (apiHistory ?? []) : guestHistory) as any[];

  const filtered = history.filter(r =>
    !search || r.filterName?.toLowerCase().includes(search.toLowerCase()) ||
    r.cartridgeName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-primary" />
          {t("Replacement History", "سجل الاستبدال")}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("All past cartridge replacements", "جميع عمليات استبدال الخراطيش السابقة")}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("Search by filter or cartridge...", "ابحث بالفلتر أو الخرطوشة...")}
          className="ps-9"
          data-testid="input-search-history"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-muted/20">
          <RefreshCw className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {search ? t("No matching records", "لا توجد سجلات مطابقة") : t("No replacement history yet", "لا يوجد سجل استبدال بعد")}
          </p>
          {!search && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("Replacements will appear here after you mark cartridges as replaced", "ستظهر الاستبدالات هنا بعد تحديد الخراطيش كمستبدلة")}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((record: any, i: number) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4"
              data-testid={`history-record-${record.id}`}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/filters/${record.filterId}`}>
                  <div className="font-medium text-foreground text-sm hover:text-primary transition-colors truncate cursor-pointer">
                    {record.filterName}
                  </div>
                </Link>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {record.cartridgeName}
                  {record.notes && ` • ${record.notes}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium text-foreground">
                  {format(parseISO(record.replacedAt), "MMM d, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t(`Stage ${record.stageNumber}`, `المرحلة ${record.stageNumber}`)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t(`${filtered.length} record${filtered.length !== 1 ? "s" : ""}`, `${filtered.length} سجل`)}
        </p>
      )}
    </div>
  );
}
