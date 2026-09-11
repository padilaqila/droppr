"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, Info, CheckCircle2, X, Loader2 } from "lucide-react";
import { ButtonSecondary } from "./button";

export type ConfirmModalVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isAlert?: boolean;
  isLoading?: boolean;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isAlert?: boolean;
  isLoading?: boolean;
  onConfirm?: () => void | Promise<void>;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  variant = "danger",
  isAlert = false,
  isLoading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading && !internalLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, internalLoading, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const effectiveLoading = isLoading || internalLoading;

  const handleConfirm = async () => {
    if (isAlert) {
      onClose();
      return;
    }
    if (!onConfirm) {
      onClose();
      return;
    }
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Confirm action error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="w-5 h-5 text-status-overdue shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-accent shrink-0" />;
      case "info":
        return <Info className="w-5 h-5 text-status-in-progress shrink-0" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-status-completed shrink-0" />;
    }
  };

  const getIconContainerStyle = () => {
    switch (variant) {
      case "danger":
        return "bg-status-overdue/10 border border-status-overdue/25";
      case "warning":
        return "bg-accent/10 border border-accent/25";
      case "info":
        return "bg-status-in-progress/10 border border-status-in-progress/25";
      case "success":
        return "bg-status-completed/10 border border-status-completed/25";
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case "danger":
        return "bg-status-overdue text-white hover:bg-status-overdue/90 active:bg-status-overdue/80 shadow-md shadow-status-overdue/20";
      case "warning":
        return "bg-accent text-on-accent hover:bg-accent-pressed active:bg-accent-deep shadow-md shadow-accent/20";
      case "info":
        return "bg-status-in-progress text-white hover:bg-status-in-progress/90 active:bg-status-in-progress/80 shadow-md shadow-status-in-progress/20";
      case "success":
        return "bg-status-completed text-white hover:bg-status-completed/90 active:bg-status-completed/80 shadow-md shadow-status-completed/20";
    }
  };

  const defaultConfirmLabel = isAlert
    ? "Mengerti"
    : variant === "danger"
    ? "Hapus"
    : "Konfirmasi";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 overscroll-contain">
      {/* Full-screen Backdrop */}
      <div
        className="fixed inset-0 bg-[#07090E]/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!effectiveLoading) onClose();
        }}
      />

      {/* Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md bg-bg-elevated border border-border-hairline rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getIconContainerStyle()}`}
            >
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h3
                id="confirm-modal-title"
                className="text-body-md sm:text-heading-3 font-semibold text-text-primary leading-tight"
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              disabled={effectiveLoading}
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-elevated-2 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="text-body-sm text-text-secondary leading-relaxed pl-0 sm:pl-[54px]">
            {typeof description === "string" ? (
              <p className="whitespace-pre-line">{description}</p>
            ) : (
              description
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 sm:px-6 sm:py-4 bg-bg-base/40 border-t border-border-hairline">
          {!isAlert && (
            <ButtonSecondary
              type="button"
              onClick={onClose}
              disabled={effectiveLoading}
              className="text-caption sm:text-body-sm font-semibold px-4 py-2"
            >
              {cancelLabel}
            </ButtonSecondary>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={effectiveLoading}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-caption sm:text-body-sm font-semibold transition-all disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {effectiveLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{confirmLabel || defaultConfirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
