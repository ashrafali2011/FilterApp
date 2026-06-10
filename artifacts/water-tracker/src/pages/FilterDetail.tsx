import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import CartridgeCard from "@/components/CartridgeCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import {
  useGetFilter, getGetFilterQueryKey,
  useDeleteFilter, useUpdateFilter,
  useReplaceAllCartridges, useReplaceCartridge,
  useGetFilterHistory, getGetFilterHistoryQueryKey,
  useListBanners, getListBannersQueryKey,
  getListFiltersQueryKey, getGetFiltersSummaryQueryKey, getGetUpcomingReplacementsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  guestGetFilter, guestDeleteFilter, guestUpdateFilter,
  guestReplaceCartridge, guestReplaceAll, guestGetFilterHistory,
} from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Edit2, RefreshCw, History, MapPin, Calendar, Save, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function FilterDetail() {
  const { filterId } = useParams<{ filterId: string }>();
  const id = parseInt(filterId, 10);
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest } = useAuth();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [guestFilter, setGuestFilter] = useState<any>(null);
  const [guestHistory, setGuestHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [replaceAllOpen, setReplaceAllOpen] = useState(false);
  const [replaceAt, setReplaceAt] = useState(new Date().toISOString().split("T")[0]);

  const { data: apiFilter, isLoading } = useGetFilter(id, {
    query: { enabled: isAuthenticated, queryKey: getGetFilterQueryKey(id) }
  });
  const { data: apiHistory } = useGetFilterHistory(id, {
    query: { enabled: isAuthenticated && showHistory, queryKey: getGetFilterHistoryQueryKey(id) }
  });
  const { data: banners } = useListBanners({ query: { queryKey: getListBannersQueryKey() } });

  const deleteFilterMutation = useDeleteFilter();
  const updateFilterMutation = useUpdateFilter();
  const replaceAllMutation = useReplaceAllCartridges();
  const replaceCartridgeMutation = useReplaceCartridge();

  const filter = isAuthenticated ? apiFilter : guestFilter;
  const history = isAuthenticated ? (apiHistory ?? []) : guestHistory;
  const detailBanner = banners?.find(b => b.position === "filter_detail" && b.enabled);

  useEffect(() => {
    if (isGuest && !isAuthenticated) {
      setGuestFilter(guestGetFilter(id));
      setGuestHistory(guestGetFilterHistory(id));
    }
  }, [id, isGuest, isAuthenticated]);

  useEffect(() => {
    if (filter) {
      setEditName(filter.name ?? "");
      setEditLocation(filter.location ?? "");
      setEditNotes((filter as any).notes ?? "");
    }
  }, [filter]);

  const handleDelete = () => {
    if (isAuthenticated) {
      deleteFilterMutation.mutate({ filterId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFiltersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFiltersSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUpcomingReplacementsQueryKey() });
          toast({ title: t("Filter deleted", "تم حذف الفلتر") });
          setLocation("/");
        },
        onError: () => toast({ title: t("Failed to delete", "فشل الحذف"), variant: "destructive" }),
      });
    } else {
      guestDeleteFilter(id);
      toast({ title: t("Filter deleted", "تم حذف الفلتر") });
      setLocation("/");
    }
  };

  const handleSaveEdit = () => {
    if (isAuthenticated) {
      updateFilterMutation.mutate(
        { filterId: id, data: { name: editName, location: editLocation || null, notes: editNotes || null } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetFilterQueryKey(id) });
            setEditing(false);
            toast({ title: t("Updated!", "تم التحديث!") });
          },
        }
      );
    } else {
      guestUpdateFilter(id, { name: editName, location: editLocation || null, notes: editNotes || null });
      setGuestFilter(guestGetFilter(id));
      setEditing(false);
      toast({ title: t("Updated!", "تم التحديث!") });
    }
  };

  const handleReplaceCartridge = (cartridgeId: number, replacedAt: string, notes?: string) => {
    if (isAuthenticated) {
      replaceCartridgeMutation.mutate(
        { filterId: id, cartridgeId, data: { replacedAt, notes: notes ?? null } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetFilterQueryKey(id) });
            toast({ title: t("Cartridge replaced!", "تم استبدال الخرطوشة!") });
          },
        }
      );
    } else {
      guestReplaceCartridge(id, cartridgeId, replacedAt, notes);
      setGuestFilter(guestGetFilter(id));
      setGuestHistory(guestGetFilterHistory(id));
      toast({ title: t("Cartridge replaced!", "تم استبدال الخرطوشة!") });
    }
  };

  const handleReplaceAll = () => {
    if (isAuthenticated) {
      replaceAllMutation.mutate(
        { filterId: id, data: { replacedAt: replaceAt } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetFilterQueryKey(id) });
            setReplaceAllOpen(false);
            toast({ title: t("All cartridges replaced!", "تم استبدال جميع الخراطيش!") });
          },
        }
      );
    } else {
      guestReplaceAll(id, replaceAt);
      setGuestFilter(guestGetFilter(id));
      setGuestHistory(guestGetFilterHistory(id));
      setReplaceAllOpen(false);
      toast({ title: t("All cartridges replaced!", "تم استبدال جميع الخراطيش!") });
    }
  };

  if (isLoading || (!filter && (isAuthenticated || isGuest))) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!filter) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("Filter not found", "الفلتر غير موجود")}</p>
        <Link href="/"><Button className="mt-4">{t("Go Home", "الرئيسية")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-lg font-bold h-9" data-testid="input-edit-filter-name" />
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder={t("Location", "الموقع")} className="h-8 text-sm" data-testid="input-edit-location" />
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder={t("Notes", "ملاحظات")} className="h-8 text-sm" data-testid="input-edit-notes" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="gap-1.5" data-testid="button-save-edit"><Save className="w-3 h-3" />{t("Save", "حفظ")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit"><X className="w-3 h-3" /></Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground" data-testid="text-filter-name">{filter.name}</h1>
                <StatusBadge status={filter.status} />
              </div>
              {filter.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />{filter.location}
                </div>
              )}
              {(filter as any).notes && (
                <p className="text-sm text-muted-foreground mt-1">{(filter as any).notes}</p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} data-testid="button-edit-filter">
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive" data-testid="button-delete-filter">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Delete filter?", "حذف الفلتر؟")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("This will permanently delete this filter and all its data.", "سيتم حذف هذا الفلتر وجميع بياناته نهائياً.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete">
                    {t("Delete", "حذف")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Detail Banner */}
      {detailBanner && (
        <a href={detailBanner.clickUrl ?? undefined} target="_blank" rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
          data-testid="banner-filter-detail"
        >
          <img src={detailBanner.imageUrl} alt="Advertisement" className="w-full h-16 object-cover" />
        </a>
      )}

      {/* Replace All */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">{t("Cartridges", "الخراطيش")} <span className="text-muted-foreground font-normal text-sm">({filter.cartridges?.length ?? 0})</span></h2>
        {(filter.cartridges?.length ?? 0) > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setReplaceAllOpen(true)} data-testid="button-replace-all">
            <RefreshCw className="w-3 h-3" />
            {t("Replace All", "استبدال الكل")}
          </Button>
        )}
      </div>

      {/* Cartridges Grid */}
      {!filter.cartridges || filter.cartridges.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
          {t("No cartridges. Add some to this filter.", "لا توجد خراطيش.")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filter.cartridges.map((c: any) => (
            <CartridgeCard key={c.id} cartridge={c} onReplace={handleReplaceCartridge} />
          ))}
        </div>
      )}

      {/* History */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          data-testid="button-toggle-history"
        >
          <History className="w-4 h-4" />
          {t("Replacement History", "سجل الاستبدال")}
          <span className="text-muted-foreground font-normal">({history.length})</span>
        </button>

        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("No history yet", "لا يوجد سجل بعد")}</p>
            ) : history.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-muted/50 rounded-lg text-sm" data-testid={`history-item-${r.id}`}>
                <div>
                  <div className="font-medium text-foreground">{r.cartridgeName}</div>
                  {r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0 ms-3">
                  {format(parseISO(r.replacedAt), "MMM d, yyyy")}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Replace All Dialog */}
      <Dialog open={replaceAllOpen} onOpenChange={setReplaceAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Replace All Cartridges", "استبدال جميع الخراطيش")}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t(`This will mark all ${filter.cartridges?.length} cartridges as replaced.`, `سيتم تحديد جميع الخراطيش الـ${filter.cartridges?.length} كمستبدلة.`)}
            </p>
            <div className="space-y-1.5">
              <Label>{t("Replacement Date", "تاريخ الاستبدال")}</Label>
              <Input type="date" value={replaceAt} onChange={e => setReplaceAt(e.target.value)} data-testid="input-replace-all-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceAllOpen(false)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={handleReplaceAll} data-testid="button-confirm-replace-all">
              <RefreshCw className="w-4 h-4 me-2" />
              {t("Replace All", "استبدال الكل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
