import { CardBase } from "@/components/ui/card";
import { ButtonPrimary } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">
            Reminders & Notifikasi
          </h1>
          <p className="text-body-sm text-text-secondary">
            Pantau jadwal snapshot, deadline task harian, dan notifikasi Siap Klaim.
          </p>
        </div>
        <div>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Buat Reminder</span>
          </ButtonPrimary>
        </div>
      </div>

      <CardBase className="text-center py-12 space-y-2">
        <Bell className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <h3 className="text-heading-3 font-semibold text-text-primary">
          Belum ada reminder terjadwal
        </h3>
        <p className="text-body-sm text-text-secondary max-w-md mx-auto">
          Fitur reminder terjadwal (Supabase Edge Function / cron) belum diimplementasikan.
        </p>
      </CardBase>
    </div>
  );
}
