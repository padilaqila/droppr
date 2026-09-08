import { CardBase } from "@/components/ui/card";
import { ButtonPrimary } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-semibold text-text-primary">Tasks</h1>
          <p className="text-body-sm text-text-secondary">
            Agregat seluruh tugas dari semua project yang sedang berjalan.
          </p>
        </div>
        <div>
          <ButtonPrimary className="inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Task</span>
          </ButtonPrimary>
        </div>
      </div>

      <CardBase className="text-center py-12 space-y-2">
        <h3 className="text-heading-3 font-semibold text-text-primary">
          Belum ada task aktif
        </h3>
        <p className="text-body-sm text-text-secondary max-w-md mx-auto">
          Fitur filter grup (Hari Ini / Minggu Ini / Overdue) dan integrasi database belum diimplementasikan.
        </p>
      </CardBase>
    </div>
  );
}
