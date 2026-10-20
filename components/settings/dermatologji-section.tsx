"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Info, ScanSearch, Sparkles, Pill, FlaskConical, ShoppingBag } from "lucide-react"
import { Card, CardContent } from "@core/components/ui/card"
import { Switch } from "@core/components/ui/switch"
import { useClinicSettings } from "@core/context/clinic-settings-context"
import { setFeatureFlag } from "@core/lib/api/settings"

type DermatologyFeatureKey = 'medical' | 'cosmetic' | 'isotretinoin' | 'biopsy' | 'retailPos'

const TOGGLES: { key: DermatologyFeatureKey; icon: typeof ScanSearch; hasFeature: boolean }[] = [
  { key: "medical",      icon: ScanSearch,    hasFeature: true },
  { key: "cosmetic",     icon: Sparkles,      hasFeature: true },
  { key: "isotretinoin", icon: Pill,          hasFeature: false },
  { key: "biopsy",       icon: FlaskConical,  hasFeature: false },
  { key: "retailPos",    icon: ShoppingBag,   hasFeature: false },
]

// Real, clinic_settings-backed toggles — see DERMATOLOGY-FEATURES.md §4.
// 'medical' gates the skin-lesion tracking + patch-test panels on the
// patient page; 'cosmetic' gates the cosmetic plans panel. The other three
// have no feature built behind them yet, so they just persist the clinic's
// preference ahead of that work (each says so in its own hint below) rather
// than pretend to control something that doesn't exist.
export function DermatologjiSection() {
  const t = useTranslations("dermatologji-section")
  const { featureFlags, reload } = useClinicSettings()
  const [savingKey, setSavingKey] = useState<DermatologyFeatureKey | null>(null)

  const handleToggle = async (key: DermatologyFeatureKey, enabled: boolean) => {
    setSavingKey(key)
    try {
      await setFeatureFlag(key, enabled)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--p-blue)]/30 ibg-blue">
        <Info className="h-5 w-5 ic-blue shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">{t("notice")}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 divide-y divide-border">
          {TOGGLES.map(({ key, icon: Icon, hasFeature }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/10 rounded-xl shrink-0">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {t(`toggles.${key}.label`)}
                    {!hasFeature && (
                      <span className="chip-neutral rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                        {t("comingSoon")}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`toggles.${key}.hint`)}</p>
                </div>
              </div>
              <Switch
                checked={featureFlags[key] ?? false}
                disabled={savingKey === key}
                onCheckedChange={(checked) => handleToggle(key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
