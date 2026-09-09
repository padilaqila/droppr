"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/select";
import { Clock, Calendar, Repeat, Bell, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  type ReminderScheduleType,
  DAYS_OF_WEEK,
  calculateNextTrigger,
  encodeFrequency,
  decodeFrequency,
  formatReminderSchedule,
} from "@/lib/supabase/reminders-helper";
import { useTranslation } from "@/lib/i18n/context";

type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

interface ProjectOption {
  id: string;
  name: string;
  chain?: string | null;
}

interface SetReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultTaskId?: string;
  editingReminder?: ReminderRow | null;
  onReminderSaved?: () => void;
}

export function SetReminderModal({
  isOpen,
  onClose,
  defaultProjectId,
  editingReminder,
  onReminderSaved,
}: SetReminderModalProps) {
  const { isEn } = useTranslation();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || ""
  );

  // Scheduling States
  const [scheduleType, setScheduleType] = useState<ReminderScheduleType>("daily");
  const [timeString, setTimeString] = useState<string>("07:00"); // Default 07:00 Pagi
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon"]);
  const [specificDate, setSpecificDate] = useState<string>("");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format today / tomorrow for initial specificDate fallback
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient() as any;

    // Fetch user's projects for target selection
    supabase
      .from("projects")
      .select("id, name, chain")
      .order("name")
      .then(({ data }: any) => {
        if (data) setProjects(data);
      });

    if (editingReminder) {
      setSelectedProjectId(editingReminder.project_id || defaultProjectId || "");
      setChannels(editingReminder.channel || ["in_app"]);

      const decoded = decodeFrequency(editingReminder.frequency);
      setScheduleType(decoded.scheduleType);
      setTimeString(decoded.timeString || "07:00");
      setSelectedDays(decoded.selectedDays.length > 0 ? decoded.selectedDays : ["mon"]);
      setSpecificDate(decoded.specificDate || getTomorrowString());
    } else {
      setSelectedProjectId(defaultProjectId || "");
      setScheduleType("daily");
      setTimeString("07:00"); // Strict default per user request
      setSelectedDays(["mon"]);
      setSpecificDate(getTomorrowString());
      setChannels(["in_app"]);
      setError(null);
    }
  }, [isOpen, defaultProjectId, editingReminder]);

  const handleToggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleToggleChannel = (channel: string) => {
    if (channels.includes(channel)) {
      if (channels.length > 1) {
        setChannels(channels.filter((c) => c !== channel));
      }
    } else {
      setChannels([...channels, channel]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Silakan pilih proyek airdrop yang ingin diingatkan.");
      return;
    }

    if (!timeString) {
      setError("Tentukan jam pengingat (default 07:00 pagi).");
      return;
    }

    if (scheduleType === "weekly" && selectedDays.length === 0) {
      setError("Pilih minimal satu hari dalam seminggu.");
      return;
    }

    if (scheduleType === "once" && !specificDate) {
      setError("Tentukan tanggal pengingat spesifik.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesi login berakhir. Silakan login kembali.");
        setLoading(false);
        return;
      }

      const encodedFreq = encodeFrequency(
        scheduleType,
        timeString,
        selectedDays,
        specificDate
      );
      const nextTriggerIso = calculateNextTrigger(
        scheduleType,
        timeString,
        selectedDays,
        specificDate
      );

      if (editingReminder) {
        const { error: updateErr } = await supabase
          .from("reminders")
          .update({
            project_id: selectedProjectId,
            task_id: null, // Project-level reminders
            frequency: encodedFreq,
            channel: channels,
            next_trigger_at: nextTriggerIso,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingReminder.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("reminders").insert({
          user_id: user.id,
          project_id: selectedProjectId,
          task_id: null,
          frequency: encodedFreq,
          channel: channels,
          next_trigger_at: nextTriggerIso,
        });

        if (insertErr) throw insertErr;
      }

      if (onReminderSaved) onReminderSaved();
      onClose();
    } catch (err: any) {
      console.error("Save reminder error:", err);
      setError(err?.message || (isEn ? "Failed to save reminder." : "Gagal menyimpan pengingat."));
    } finally {
      setLoading(false);
    }
  };

  const previewScheduleText = formatReminderSchedule(
    encodeFrequency(scheduleType, timeString, selectedDays, specificDate)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingReminder
          ? (isEn ? "Edit Project Reminder Schedule" : "Ubah Jadwal Pengingat Proyek")
          : (isEn ? "Set Project Reminder" : "Pasang Pengingat Proyek")
      }
      description={
        isEn
          ? "Choose a project and set daily or weekly reminders so you never miss a farming schedule."
          : "Pilih proyek dan atur waktu pengingat harian atau mingguan agar kamu siap menggarap sesuai jadwal."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-status-overdue/10 border border-status-overdue text-status-overdue text-caption">
            {error}
          </div>
        )}

        {/* 1. Project Selector */}
        <div>
          <CustomSelect
            label={isEn ? "Select Airdrop Project" : "Pilih Proyek Airdrop"}
            required
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            disabled={loading}
            placeholder={isEn ? "-- Select Project to Set Reminder --" : "-- Pilih Proyek yang Ingin Diingatkan --"}
            options={projects.map((p) => ({
              value: p.id,
              label: p.name,
              badge: p.chain ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated-2 border border-border-hairline text-text-tertiary uppercase">
                  {p.chain}
                </span>
              ) : undefined,
            }))}
          />
        </div>

        {/* 2. Schedule Pattern Selector */}
        <div className="space-y-2">
          <label className="block text-body-sm font-medium text-text-secondary">
            {isEn ? "Notification Pattern" : "Pola Notifikasi"} <span className="text-status-overdue">*</span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {/* Daily */}
            <button
              type="button"
              onClick={() => setScheduleType("daily")}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                scheduleType === "daily"
                  ? "bg-accent/10 border-accent text-text-primary"
                  : "bg-bg-elevated-2 border-border-hairline hover:border-border-hairline-strong text-text-secondary"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Repeat
                  className={`w-4 h-4 ${
                    scheduleType === "daily" ? "text-accent" : "text-text-tertiary"
                  }`}
                />
                {scheduleType === "daily" && (
                  <Check className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <div className="text-caption font-semibold text-text-primary">
                {isEn ? "Every Day" : "Setiap Hari"}
              </div>
              <div className="text-[11px] text-text-tertiary">Daily reminder</div>
            </button>

            {/* Weekly / Specific Days */}
            <button
              type="button"
              onClick={() => setScheduleType("weekly")}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                scheduleType === "weekly"
                  ? "bg-accent/10 border-accent text-text-primary"
                  : "bg-bg-elevated-2 border-border-hairline hover:border-border-hairline-strong text-text-secondary"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Calendar
                  className={`w-4 h-4 ${
                    scheduleType === "weekly" ? "text-accent" : "text-text-tertiary"
                  }`}
                />
                {scheduleType === "weekly" && (
                  <Check className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <div className="text-caption font-semibold text-text-primary">
                {isEn ? "Specific Days" : "Hari Tertentu"}
              </div>
              <div className="text-[11px] text-text-tertiary">
                {isEn ? "Pick days of week" : "Pilih hari seminggu"}
              </div>
            </button>

            {/* Once / Specific Date */}
            <button
              type="button"
              onClick={() => setScheduleType("once")}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                scheduleType === "once"
                  ? "bg-accent/10 border-accent text-text-primary"
                  : "bg-bg-elevated-2 border-border-hairline hover:border-border-hairline-strong text-text-secondary"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Clock
                  className={`w-4 h-4 ${
                    scheduleType === "once" ? "text-accent" : "text-text-tertiary"
                  }`}
                />
                {scheduleType === "once" && (
                  <Check className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <div className="text-caption font-semibold text-text-primary">
                {isEn ? "Specific Date" : "Tanggal Spesifik"}
              </div>
              <div className="text-[11px] text-text-tertiary">
                {isEn ? "Once on date X" : "Sekali pada tgl X"}
              </div>
            </button>
          </div>
        </div>

        {/* 2b. Conditional Day of Week Picker (If Weekly) */}
        {scheduleType === "weekly" && (
          <div className="p-3 rounded-lg bg-bg-elevated-2 border border-border-hairline space-y-2">
            <span className="text-[12px] font-medium text-text-secondary block">
              {isEn
                ? "Select Reminder Days (Repeats weekly on chosen days):"
                : "Pilih Hari Pengingat (Setiap minggu pada hari yang dipilih):"}
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                const dayLabel = isEn
                  ? ({ mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as Record<string, string>)[d.id] || d.label
                  : d.label;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleToggleDay(d.id)}
                    className={`py-1.5 text-caption font-semibold rounded-md border text-center transition-colors ${
                      isSelected
                        ? "bg-accent text-on-accent border-accent"
                        : "bg-bg-elevated text-text-secondary border-border-hairline hover:border-border-hairline-strong hover:text-text-primary"
                    }`}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2c. Conditional Specific Date Picker (If Once) */}
        {scheduleType === "once" && (
          <div className="p-3 rounded-lg bg-bg-elevated-2 border border-border-hairline space-y-1.5">
            <label className="text-[12px] font-medium text-text-secondary block">
              {isEn ? "Select Reminder Date:" : "Pilih Tanggal Pengingat:"}
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              required={scheduleType === "once"}
              min={new Date().toISOString().split("T")[0]}
              className="w-full h-10 bg-bg-elevated text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent font-mono"
            />
          </div>
        )}

        {/* 3. Time Selector (Default 07:00 Pagi) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-medium text-text-secondary">
              {isEn ? "Notification Time" : "Jam Notifikasi"} <span className="text-status-overdue">*</span>
            </label>
            <span className="text-[11px] text-text-tertiary">
              {isEn ? "Default: 07:00 AM" : "Default: 07:00 Pagi"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="time"
                value={timeString}
                onChange={(e) => setTimeString(e.target.value)}
                required
                disabled={loading}
                className="w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent font-mono transition-colors"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTimeString("07:00")}
                className={`px-2.5 py-2 text-[11px] font-mono rounded-md border transition-colors ${
                  timeString === "07:00"
                    ? "bg-accent/15 border-accent text-accent font-bold"
                    : "bg-bg-elevated-2 border-border-hairline text-text-secondary hover:text-text-primary"
                }`}
                title={isEn ? "07:00 AM (Standard)" : "Pukul 07:00 Pagi (Standar)"}
              >
                07:00 ({isEn ? "AM" : "Pagi"})
              </button>
              <button
                type="button"
                onClick={() => setTimeString("12:00")}
                className={`px-2.5 py-2 text-[11px] font-mono rounded-md border transition-colors ${
                  timeString === "12:00"
                    ? "bg-accent/15 border-accent text-accent font-bold"
                    : "bg-bg-elevated-2 border-border-hairline text-text-secondary hover:text-text-primary"
                }`}
              >
                12:00
              </button>
              <button
                type="button"
                onClick={() => setTimeString("19:00")}
                className={`px-2.5 py-2 text-[11px] font-mono rounded-md border transition-colors ${
                  timeString === "19:00"
                    ? "bg-accent/15 border-accent text-accent font-bold"
                    : "bg-bg-elevated-2 border-border-hairline text-text-secondary hover:text-text-primary"
                }`}
              >
                19:00
              </button>
            </div>
          </div>
        </div>

        {/* 4. Schedule Live Preview Banner */}
        <div className="p-3 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-between text-body-sm">
          <div className="flex items-center gap-2 text-text-primary">
            <Bell className="w-4 h-4 text-accent shrink-0" />
            <span>
              {isEn ? "Schedule: " : "Jadwal: "}
              <strong className="text-accent">{previewScheduleText}</strong>
            </span>
          </div>
        </div>

        {/* 5. Notification Channels */}
        <div>
          <label className="block text-body-sm font-medium text-text-secondary mb-1">
            {isEn ? "Notification Channels" : "Saluran Notifikasi"}
          </label>
          <div className="flex items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-body-sm text-text-primary">
              <input
                type="checkbox"
                checked={channels.includes("in_app")}
                onChange={() => handleToggleChannel("in_app")}
                className="rounded border-border-hairline-strong text-accent focus:ring-0"
              />
              <span>In-App Notification</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-body-sm text-text-primary">
              <input
                type="checkbox"
                checked={channels.includes("email")}
                onChange={() => handleToggleChannel("email")}
                className="rounded border-border-hairline-strong text-accent focus:ring-0"
              />
              <span>Email Alert</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-hairline">
          <ButtonSecondary type="button" onClick={onClose} disabled={loading}>
            {isEn ? "Cancel" : "Batal"}
          </ButtonSecondary>
          <ButtonPrimary type="submit" disabled={loading}>
            {loading
              ? (isEn ? "Saving..." : "Menyimpan...")
              : editingReminder
              ? (isEn ? "Save Changes" : "Simpan Perubahan")
              : (isEn ? "Set Reminder" : "Pasang Pengingat")}
          </ButtonPrimary>
        </div>
      </form>
    </Modal>
  );
}
