import { CardBase } from "@/components/ui/card";
import { ButtonSecondary } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-heading-2 font-semibold text-text-primary">Settings</h1>
        <p className="text-body-sm text-text-secondary">
          Pengaturan akun, preferensi notifikasi, dan manajemen data.
        </p>
      </div>

      <CardBase className="space-y-4">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Akun & Keamanan
        </h2>
        <p className="text-body-sm text-text-secondary">
          Autentikasi dikelola oleh Supabase Auth.
        </p>
        <div className="pt-2">
          <ButtonSecondary>Kelola Profil</ButtonSecondary>
        </div>
      </CardBase>

      <CardBase className="space-y-4">
        <h2 className="text-app-section-title font-semibold text-text-primary">
          Export Data
        </h2>
        <p className="text-body-sm text-text-secondary">
          Unduh seluruh data project, task, dan catatan ke dalam format JSON/CSV.
        </p>
        <div className="pt-2">
          <ButtonSecondary>Export Data</ButtonSecondary>
        </div>
      </CardBase>
    </div>
  );
}
