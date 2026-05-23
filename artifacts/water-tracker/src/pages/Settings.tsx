import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { guestExportData, guestImportData } from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Sun, Moon, Monitor, Globe, Bell, Download, Upload, LogOut, Shield } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState([7, 10, 20]);
  const [customDay, setCustomDay] = useState("");

  const { data: settings } = useGetSettings({
    query: { enabled: isAuthenticated, queryKey: getGetSettingsQueryKey() }
  });
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) {
      setNotificationsEnabled(settings.notificationsEnabled);
      setReminderDays(settings.reminderDays);
    }
  }, [settings]);

  const saveSettings = () => {
    if (isAuthenticated) {
      updateSettingsMutation.mutate(
        { data: { notificationsEnabled, reminderDays, language, theme } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
            toast({ title: t("Settings saved!", "تم حفظ الإعدادات!") });
          },
        }
      );
    } else {
      localStorage.setItem("aquatrack_settings", JSON.stringify({ notificationsEnabled, reminderDays }));
      toast({ title: t("Settings saved!", "تم حفظ الإعدادات!") });
    }
  };

  const addReminderDay = () => {
    const day = parseInt(customDay);
    if (!isNaN(day) && day > 0 && !reminderDays.includes(day)) {
      setReminderDays([...reminderDays, day].sort((a, b) => a - b));
      setCustomDay("");
    }
  };

  const removeReminderDay = (day: number) => {
    setReminderDays(reminderDays.filter(d => d !== day));
  };

  const handleExport = () => {
    const data = guestExportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquatrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("Data exported!", "تم تصدير البيانات!") });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const success = guestImportData(text);
        if (success) {
          toast({ title: t("Data imported successfully!", "تم استيراد البيانات بنجاح!") });
          window.location.reload();
        } else {
          toast({ title: t("Invalid backup file", "ملف النسخة الاحتياطية غير صالح"), variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          {t("Settings", "الإعدادات")}
        </h1>
      </div>

      {/* Account */}
      {isAuthenticated && user && (
        <Section title={t("Account", "الحساب")}>
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="font-medium text-foreground">{user.username}</div>
              <div className="text-xs text-muted-foreground">{t("Synced account", "حساب متزامن")}</div>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" data-testid="button-logout">
              <LogOut className="w-3.5 h-3.5" />
              {t("Log out", "تسجيل الخروج")}
            </Button>
          </div>
        </Section>
      )}

      {/* Appearance */}
      <Section title={t("Appearance", "المظهر")}>
        <div className="space-y-4">
          {/* Theme */}
          <div>
            <Label className="text-sm font-medium">{t("Theme", "الثيم")}</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {([
                { value: "light", icon: Sun, label: t("Light", "فاتح") },
                { value: "dark", icon: Moon, label: t("Dark", "داكن") },
                { value: "system", icon: Monitor, label: t("System", "النظام") },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-all",
                    theme === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                  )}
                  data-testid={`button-theme-${value}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <Label className="text-sm font-medium">{t("Language", "اللغة")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLanguage(value as "en" | "ar")}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                    language === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                  data-testid={`button-language-${value}`}
                >
                  <Globe className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title={t("Notifications", "الإشعارات")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">{t("Enable Reminders", "تفعيل التذكيرات")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("Get notified before replacements are due", "تلقَّ إشعارات قبل مواعيد الاستبدال")}</p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              data-testid="switch-notifications"
            />
          </div>

          {notificationsEnabled && (
            <div>
              <Label className="text-sm">{t("Remind me before (days)", "تذكيرني قبل (أيام)")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {reminderDays.map(day => (
                  <button
                    key={day}
                    onClick={() => removeReminderDay(day)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title={t("Click to remove", "انقر للإزالة")}
                    data-testid={`reminder-day-${day}`}
                  >
                    {day}d ×
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  value={customDay}
                  onChange={e => setCustomDay(e.target.value)}
                  placeholder={t("Add days...", "أضف أيام...")}
                  className="h-8 text-sm w-32"
                  onKeyDown={e => e.key === "Enter" && addReminderDay()}
                  data-testid="input-custom-reminder-day"
                />
                <Button size="sm" variant="outline" onClick={addReminderDay} data-testid="button-add-reminder-day">
                  {t("Add", "إضافة")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Data */}
      <Section title={t("Data & Backup", "البيانات والنسخ الاحتياطي")}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("Export your data as a JSON file. Import to restore.", "صدِّر بياناتك كملف JSON. استورد لاستعادتها.")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" data-testid="button-export">
              <Download className="w-3.5 h-3.5" />
              {t("Export", "تصدير")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5" data-testid="button-import">
              <Upload className="w-3.5 h-3.5" />
              {t("Import", "استيراد")}
            </Button>
          </div>
        </div>
      </Section>

      {/* Admin */}
      <Section title={t("Advanced", "متقدم")}>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-admin-panel">
            <Shield className="w-3.5 h-3.5" />
            {t("Admin Panel", "لوحة الإدارة")}
          </Button>
        </Link>
      </Section>

      <Button className="w-full" onClick={saveSettings} disabled={updateSettingsMutation.isPending} data-testid="button-save-settings">
        {updateSettingsMutation.isPending ? t("Saving...", "جاري الحفظ...") : t("Save Settings", "حفظ الإعدادات")}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 space-y-4"
    >
      <h2 className="font-semibold text-sm text-foreground uppercase tracking-wide">{title}</h2>
      <Separator />
      {children}
    </motion.div>
  );
}
