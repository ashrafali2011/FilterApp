import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useCreateFilter, useCreateCartridge, getListFiltersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { guestCreateFilter, guestCreateCartridge } from "@/lib/guest-storage";
import { FILTER_TEMPLATES, getTemplate, FilterTemplate } from "@/lib/filter-templates";
import { FilterInputTemplateType } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface CartridgeRow {
  name: string;
  stageNumber: number;
  intervalDays: number;
}

export default function NewFilter() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest } = useAuth();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [step, setStep] = useState<"template" | "details">("template");
  const [name, setName] = useState("");
  const [location, setFilterLocation] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [cartridges, setCartridges] = useState<CartridgeRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFilterMutation = useCreateFilter();

  const selectTemplate = (tpl: FilterTemplate) => {
    setSelectedTemplate(tpl.type);
    setCartridges(tpl.cartridges.map(c => ({ ...c })));
    setStep("details");
  };

  const addCartridge = () => {
    const nextStage = cartridges.length + 1;
    setCartridges([...cartridges, { name: "", stageNumber: nextStage, intervalDays: 90 }]);
  };

  const removeCartridge = (idx: number) => {
    setCartridges(cartridges.filter((_, i) => i !== idx));
  };

  const updateCartridge = (idx: number, field: keyof CartridgeRow, value: string | number) => {
    const updated = [...cartridges];
    updated[idx] = { ...updated[idx], [field]: value };
    setCartridges(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: t("Filter name is required", "اسم الفلتر مطلوب"), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      if (isAuthenticated) {
        const filter = await new Promise<any>((resolve, reject) => {
          createFilterMutation.mutate({
            data: {
              name: name.trim(),
              location: location.trim() || null,
              templateType: (selectedTemplate ?? "custom") as FilterInputTemplateType,
              installationDate: installationDate || null,
              notes: notes.trim() || null,
            }
          }, { onSuccess: resolve, onError: reject });
        });

        for (const c of cartridges) {
          if (!c.name.trim()) continue;
          await new Promise<void>((resolve, reject) => {
            // We'll use fetch directly to create cartridges after filter creation
            fetch(`/api/filters/${filter.id}/cartridges`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("aquatrack_token")}` },
              body: JSON.stringify(c),
            }).then(() => resolve()).catch(reject);
          });
        }

        queryClient.invalidateQueries({ queryKey: getListFiltersQueryKey({}) });
        toast({ title: t("Filter created!", "تم إنشاء الفلتر!") });
        setLocation(`/filters/${filter.id}`);
      } else if (isGuest) {
        const filter = guestCreateFilter({
          name: name.trim(),
          location: location.trim() || null,
          templateType: selectedTemplate ?? "custom",
          installationDate: installationDate || null,
          notes: notes.trim() || null,
        });

        for (const c of cartridges) {
          if (!c.name.trim()) continue;
          guestCreateCartridge(filter.id, c);
        }

        toast({ title: t("Filter created!", "تم إنشاء الفلتر!") });
        setLocation(`/filters/${filter.id}`);
      }
    } catch {
      toast({ title: t("Failed to create filter", "فشل إنشاء الفلتر"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => step === "details" ? setStep("template") : setLocation("/")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("Add Water Filter", "إضافة فلتر مياه")}</h1>
          <p className="text-sm text-muted-foreground">
            {step === "template" ? t("Choose a filter type", "اختر نوع الفلتر") : t("Enter filter details", "أدخل تفاصيل الفلتر")}
          </p>
        </div>
      </div>

      {step === "template" ? (
        <div className="space-y-3">
          {FILTER_TEMPLATES.map((tpl, i) => (
            <motion.button
              key={tpl.type}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => selectTemplate(tpl)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/50 transition-all flex items-center justify-between group"
              data-testid={`button-template-${tpl.type}`}
            >
              <div>
                <div className="font-semibold text-foreground">{language === "ar" ? tpl.labelAr : tpl.label}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {tpl.cartridges.length > 0
                    ? t(`${tpl.cartridges.length} stage${tpl.cartridges.length > 1 ? "s" : ""}`, `${tpl.cartridges.length} مرحلة`)
                    : t("Add stages manually", "إضافة مراحل يدوياً")}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-foreground">{t("Filter Information", "معلومات الفلتر")}</h2>
            <div className="space-y-2">
              <Label htmlFor="filter-name">{t("Filter Name", "اسم الفلتر")} <span className="text-destructive">*</span></Label>
              <Input
                id="filter-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("e.g. Kitchen Filter", "مثال: فلتر المطبخ")}
                data-testid="input-filter-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-location">{t("Location (optional)", "الموقع (اختياري)")}</Label>
              <Input
                id="filter-location"
                value={location}
                onChange={e => setFilterLocation(e.target.value)}
                placeholder={t("e.g. Kitchen, Basement", "مثال: المطبخ، القبو")}
                data-testid="input-filter-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-install-date">{t("Installation Date (optional)", "تاريخ التركيب (اختياري)")}</Label>
              <Input
                id="filter-install-date"
                type="date"
                value={installationDate}
                onChange={e => setInstallationDate(e.target.value)}
                data-testid="input-filter-install-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-notes">{t("Notes (optional)", "ملاحظات (اختياري)")}</Label>
              <Textarea
                id="filter-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t("Any notes about this filter...", "أي ملاحظات عن هذا الفلتر...")}
                rows={2}
                data-testid="input-filter-notes"
              />
            </div>
          </div>

          {/* Cartridges */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground">{t("Cartridges / Stages", "الخراطيش / المراحل")}</h2>
              <Button variant="outline" size="sm" onClick={addCartridge} className="gap-1.5 text-xs" data-testid="button-add-cartridge">
                <Plus className="w-3 h-3" />
                {t("Add", "إضافة")}
              </Button>
            </div>

            {cartridges.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                {t("No cartridges added yet. Click Add to add stages.", "لم يتم إضافة خراطيش بعد.")}
              </div>
            ) : (
              <div className="space-y-3">
                {cartridges.map((c, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-3" data-testid={`cartridge-row-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t(`Stage ${c.stageNumber}`, `المرحلة ${c.stageNumber}`)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCartridge(idx)} data-testid={`button-remove-cartridge-${idx}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">{t("Cartridge Name", "اسم الخرطوشة")}</Label>
                        <Input
                          value={c.name}
                          onChange={e => updateCartridge(idx, "name", e.target.value)}
                          placeholder={t("e.g. Sediment Filter", "مثال: فلتر الترسيب")}
                          className="h-8 text-sm"
                          data-testid={`input-cartridge-name-${idx}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("Stage #", "رقم المرحلة")}</Label>
                        <Input
                          type="number"
                          value={c.stageNumber}
                          onChange={e => updateCartridge(idx, "stageNumber", parseInt(e.target.value) || 1)}
                          className="h-8 text-sm"
                          data-testid={`input-cartridge-stage-${idx}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("Interval (days)", "الفترة (أيام)")}</Label>
                        <Input
                          type="number"
                          value={c.intervalDays}
                          onChange={e => updateCartridge(idx, "intervalDays", parseInt(e.target.value) || 90)}
                          className="h-8 text-sm"
                          data-testid={`input-cartridge-interval-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-create-filter"
          >
            {isSubmitting ? t("Creating...", "جاري الإنشاء...") : t("Create Filter", "إنشاء الفلتر")}
          </Button>
        </div>
      )}
    </div>
  );
}
