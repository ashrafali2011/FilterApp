import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useVerifyAdminPin,
  useListAdminBanners, getListAdminBannersQueryKey,
  useCreateBanner, useUpdateBanner, useDeleteBanner,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Shield, Plus, Trash2, Edit2, Lock, Eye, EyeOff, ExternalLink } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BannerPosition = "home_top" | "home_bottom" | "filter_detail";

interface Banner {
  id: number;
  position: BannerPosition;
  imageUrl: string;
  clickUrl: string | null;
  enabled: boolean;
  createdAt: string;
}

interface BannerForm {
  position: BannerPosition;
  imageUrl: string;
  clickUrl: string;
  enabled: boolean;
}

// ─── PIN login screen ────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (pin: string) => void }) {
  const { language } = useI18n();
  const t = (en: string, ar: string) => (language === "ar" ? ar : en);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const verifyPin = useVerifyAdminPin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin.mutate(
      { data: { pin } },
      {
        onSuccess: (res: any) => {
          if (res.valid) {
            onSuccess(pin);
          } else {
            setPinError(t("Invalid PIN", "رمز PIN غير صحيح"));
          }
        },
        onError: () => setPinError(t("Invalid PIN", "رمز PIN غير صحيح")),
      }
    );
  };

  return (
    <div className="max-w-sm mx-auto min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-3">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("Admin Panel", "لوحة الإدارة")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Enter your PIN to access", "أدخل الرمز للوصول")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <Label>{t("Admin PIN", "رمز المدير")}</Label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(""); }}
                placeholder="••••"
                className="pe-10"
                autoFocus
                data-testid="input-admin-pin"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && <p className="text-xs text-destructive">{pinError}</p>}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={verifyPin.isPending}
            data-testid="button-submit-pin"
          >
            <Lock className="w-4 h-4 me-2" />
            {verifyPin.isPending
              ? t("Verifying...", "جاري التحقق...")
              : t("Access Panel", "الدخول")}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Banner management (only mounted after PIN verified) ─────────────────────

function AdminDashboard({ adminToken }: { adminToken: string }) {
  const { language } = useI18n();
  const t = (en: string, ar: string) => (language === "ar" ? ar : en);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const adminHeaders = { "x-admin-token": adminToken };

  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>({
    position: "home_top",
    imageUrl: "",
    clickUrl: "",
    enabled: true,
  });

  // Pass the admin header as `request` option so every call includes it
  const { data: banners, isLoading } = useListAdminBanners({
    query: { queryKey: getListAdminBannersQueryKey() },
    request: { headers: adminHeaders },
  });

  const createBanner = useCreateBanner({ request: { headers: adminHeaders } });
  const updateBanner = useUpdateBanner({ request: { headers: adminHeaders } });
  const deleteBanner = useDeleteBanner({ request: { headers: adminHeaders } });

  const positionLabels: Record<BannerPosition, string> = {
    home_top: t("Home — Top", "الرئيسية — أعلى"),
    home_bottom: t("Home — Bottom", "الرئيسية — أسفل"),
    filter_detail: t("Filter Detail", "تفاصيل الفلتر"),
  };

  const resetForm = () =>
    setForm({ position: "home_top", imageUrl: "", clickUrl: "", enabled: true });

  const handleCreate = () => {
    if (!form.imageUrl.trim()) {
      toast({ title: t("Image URL required", "رابط الصورة مطلوب"), variant: "destructive" });
      return;
    }
    createBanner.mutate(
      {
        data: {
          position: form.position,
          imageUrl: form.imageUrl,
          clickUrl: form.clickUrl || null,
          enabled: form.enabled,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() });
          setCreateOpen(false);
          resetForm();
          toast({ title: t("Banner created!", "تم إنشاء البانر!") });
        },
        onError: () =>
          toast({ title: t("Failed to create banner", "فشل إنشاء البانر"), variant: "destructive" }),
      }
    );
  };

  const handleUpdate = () => {
    if (!editBanner) return;
    updateBanner.mutate(
      {
        bannerId: editBanner.id,
        data: {
          position: form.position,
          imageUrl: form.imageUrl,
          clickUrl: form.clickUrl || null,
          enabled: form.enabled,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() });
          setEditBanner(null);
          toast({ title: t("Banner updated!", "تم تحديث البانر!") });
        },
      }
    );
  };

  const handleToggle = (banner: Banner) => {
    updateBanner.mutate(
      { bannerId: banner.id, data: { enabled: !banner.enabled } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteBanner.mutate(
      { bannerId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminBannersQueryKey() });
          toast({ title: t("Banner deleted", "تم حذف البانر") });
        },
      }
    );
  };

  const openEdit = (banner: Banner) => {
    setEditBanner(banner);
    setForm({
      position: banner.position,
      imageUrl: banner.imageUrl,
      clickUrl: banner.clickUrl ?? "",
      enabled: banner.enabled,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {t("Admin Panel", "لوحة الإدارة")}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t("Manage advertisement banners", "إدارة البانرات الإعلانية")}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="gap-2"
          data-testid="button-create-banner"
        >
          <Plus className="w-4 h-4" />
          {t("Add Banner", "إضافة بانر")}
        </Button>
      </div>

      {/* Banner List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">
          {t("Loading...", "جاري التحميل...")}
        </div>
      ) : !banners || banners.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t("No banners yet. Create one to get started.", "لا توجد بانرات بعد.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(banners as Banner[]).map((banner) => (
            <div
              key={banner.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
              data-testid={`banner-item-${banner.id}`}
            >
              <img
                src={banner.imageUrl}
                alt="Banner"
                className="w-24 h-12 object-cover rounded-lg border border-border shrink-0"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">
                  {positionLabels[banner.position]}
                </div>
                {banner.clickUrl && (
                  <a
                    href={banner.clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{banner.clickUrl}</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={banner.enabled}
                  onCheckedChange={() => handleToggle(banner)}
                  data-testid={`switch-banner-${banner.id}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(banner)}
                  data-testid={`button-edit-banner-${banner.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      data-testid={`button-delete-banner-${banner.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("Delete banner?", "حذف البانر؟")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("This cannot be undone.", "لا يمكن التراجع عن هذا.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(banner.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        {t("Delete", "حذف")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={createOpen || !!editBanner}
        onOpenChange={(open) => {
          if (!open) { setCreateOpen(false); setEditBanner(null); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editBanner ? t("Edit Banner", "تعديل البانر") : t("Add Banner", "إضافة بانر")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("Position", "الموضع")}</Label>
              <Select
                value={form.position}
                onValueChange={(v) => setForm({ ...form, position: v as BannerPosition })}
              >
                <SelectTrigger data-testid="select-banner-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_top">{positionLabels.home_top}</SelectItem>
                  <SelectItem value="home_bottom">{positionLabels.home_bottom}</SelectItem>
                  <SelectItem value="filter_detail">{positionLabels.filter_detail}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Image URL", "رابط الصورة")}</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-banner-image-url"
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt=""
                  className="h-16 w-full object-cover rounded-lg border border-border"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("Click URL (optional)", "رابط النقر (اختياري)")}</Label>
              <Input
                value={form.clickUrl}
                onChange={(e) => setForm({ ...form, clickUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-banner-click-url"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                data-testid="switch-banner-enabled"
              />
              <Label>{t("Enabled", "مفعّل")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); setEditBanner(null); }}
            >
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={editBanner ? handleUpdate : handleCreate}
              disabled={createBanner.isPending || updateBanner.isPending}
              data-testid="button-save-banner"
            >
              {editBanner ? t("Save", "حفظ") : t("Create", "إنشاء")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function Admin() {
  const [adminToken, setAdminToken] = useState<string | null>(null);

  if (!adminToken) {
    return <AdminLogin onSuccess={setAdminToken} />;
  }

  return <AdminDashboard adminToken={adminToken} />;
}
