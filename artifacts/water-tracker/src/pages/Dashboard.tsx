import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import FilterCard from "@/components/FilterCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import {
  useListFilters, getListFiltersQueryKey,
  useGetFiltersSummary, getGetFiltersSummaryQueryKey,
  useGetUpcomingReplacements, getGetUpcomingReplacementsQueryKey,
  useListBanners, getListBannersQueryKey,
  useGetSettings, getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import {
  guestGetFilters, guestGetSummary, guestGetUpcoming
} from "@/lib/guest-storage";
import { Plus, Droplets, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import { useNotifications, getTestMode } from "@/hooks/use-notifications";

export default function Dashboard() {
  const { isAuthenticated, isGuest, isLoading: authLoading } = useAuth();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;

  const isCloud = isAuthenticated;
  const useGuest = isGuest && !isAuthenticated;

  const { data: settings } = useGetSettings({
    query: { enabled: isCloud, queryKey: getGetSettingsQueryKey() }
  });

  // Use the largest reminder day as the look-ahead window (default 30)
  const withinDays = settings?.reminderDays?.length
    ? Math.max(...settings.reminderDays)
    : 30;

  const { data: apiFilters, isLoading: filtersLoading } = useListFilters({}, {
    query: { enabled: isCloud, queryKey: getListFiltersQueryKey({}) }
  });
  const { data: apiSummary, isLoading: summaryLoading } = useGetFiltersSummary({
    query: { enabled: isCloud, queryKey: getGetFiltersSummaryQueryKey() }
  });
  const { data: apiUpcoming } = useGetUpcomingReplacements({ withinDays }, {
    query: { enabled: isCloud, queryKey: getGetUpcomingReplacementsQueryKey({ withinDays }) }
  });
  const { data: banners } = useListBanners({
    query: { queryKey: getListBannersQueryKey() }
  });

  const guestFilters = useMemo(() => useGuest ? guestGetFilters() : [], [useGuest]);
  const guestSummary = useMemo(() => useGuest ? guestGetSummary() : null, [useGuest]);
  const guestUpcoming = useMemo(() => useGuest ? guestGetUpcoming() : [], [useGuest]);

  const upcoming = isCloud ? (apiUpcoming ?? []) : guestUpcoming;

  // Fire notification + sound when reminders are due
  useNotifications({
    enabled: settings?.notificationsEnabled ?? false,
    reminderThresholds: settings?.reminderDays ?? [],
    upcoming: upcoming as any[],
    testMode: getTestMode(),
  });

  const filters = isCloud ? (apiFilters ?? []) : guestFilters;
  const summary = isCloud ? apiSummary : guestSummary;
  const isLoading = (isCloud && (filtersLoading || summaryLoading)) || authLoading;

  const homeBannerTop = banners?.find(b => b.position === "home_top" && b.enabled);
  const homeBannerBottom = banners?.find(b => b.position === "home_bottom" && b.enabled);

  if (!isAuthenticated && !isGuest && !authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
          <Droplets className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("Welcome to AquaTrack", "مرحباً بك في AquaTrack")}</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            {t("Track your water filter cartridge replacements and never miss a maintenance date.", "تتبع استبدال خراطيش الفلتر ولا تفوّت موعد صيانة.")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button size="lg" data-testid="button-get-started">
              {t("Get Started", "ابدأ الآن")}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" data-testid="button-guest-start">
              {t("Continue as Guest", "المتابعة كضيف")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Ad */}
      {homeBannerTop && (
        <a href={homeBannerTop.clickUrl ?? undefined} target="_blank" rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
          data-testid="banner-home-top"
        >
          <img src={homeBannerTop.imageUrl} alt="Advertisement" className="w-full h-20 object-cover" />
        </a>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("Dashboard", "لوحة القيادة")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t("Monitor your water filter health", "راقب صحة فلاتر المياه")}
          </p>
        </div>
        <Link href="/filters/new">
          <Button className="gap-2" data-testid="button-add-filter">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">{t("Add Filter", "إضافة فلتر")}</span>
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t("Total Filters", "إجمالي الفلاتر")}
            value={summary.total}
            icon={<Droplets className="w-5 h-5 text-primary" />}
            bg="bg-primary/5"
          />
          <StatCard
            label={t("Healthy", "جيد")}
            value={summary.healthy}
            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            textColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label={t("Due Soon", "قريباً")}
            value={summary.warning}
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            bg="bg-amber-50 dark:bg-amber-900/20"
            textColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label={t("Overdue", "متأخر")}
            value={summary.overdue}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            bg="bg-red-50 dark:bg-red-900/20"
            textColor="text-red-600 dark:text-red-400"
          />
        </div>
      ) : null}

      {/* Upcoming Replacements */}
      {upcoming && upcoming.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            {t("Upcoming Replacements", "الاستبدالات القادمة")}
            <span className="text-xs font-normal text-muted-foreground ms-auto">
              {t(`within ${withinDays}d`, `خلال ${withinDays} يوم`)}
            </span>
          </h2>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((item: any) => (
              <Link key={item.cartridgeId} href={`/filters/${item.filterId}`}>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  data-testid={`upcoming-item-${item.cartridgeId}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{item.filterName}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.cartridgeName}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={item.status} />
                    <span className="text-xs text-muted-foreground">
                      {item.daysRemaining <= 0
                        ? t(`${Math.abs(item.daysRemaining)}d ago`, `منذ ${Math.abs(item.daysRemaining)} يوم`)
                        : t(`${item.daysRemaining}d`, `${item.daysRemaining} يوم`)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters Grid */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">{t("Your Filters", "فلاتركم")}</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : filters.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/30">
            <Droplets className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("No filters yet", "لا توجد فلاتر بعد")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("Add your first water filter to get started", "أضف فلترك الأول للبدء")}</p>
            <Link href="/filters/new">
              <Button className="mt-4 gap-2" data-testid="button-add-first-filter">
                <Plus className="w-4 h-4" />
                {t("Add Filter", "إضافة فلتر")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter: any, i: number) => (
              <FilterCard key={filter.id} filter={filter} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Banner Ad */}
      {homeBannerBottom && (
        <a href={homeBannerBottom.clickUrl ?? undefined} target="_blank" rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
          data-testid="banner-home-bottom"
        >
          <img src={homeBannerBottom.imageUrl} alt="Advertisement" className="w-full h-20 object-cover" />
        </a>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, bg, textColor }: {
  label: string; value: number; icon: React.ReactNode; bg: string; textColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${bg} rounded-xl p-4 border border-border/50`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${textColor ?? "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </motion.div>
  );
}
