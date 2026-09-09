"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: "sm" | "md";
  variant?: "default" | "subtle" | "ghost";
  required?: boolean;
  name?: string;
  align?: "left" | "right";
  id?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  label,
  error,
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  size = "md",
  variant = "default",
  required = false,
  name,
  align = "left",
  id,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Auto flip upward if close to bottom of viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If space below is less than 220px and space above is greater than space below
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, []);

  // Handle open / close toggle
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      const idx = options.findIndex((opt) => opt.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev + 1;
        while (next < options.length && options[next].disabled) {
          next++;
        }
        return next < options.length ? next : prev;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && options[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        const target = options[focusedIndex];
        if (!target.disabled) {
          onChange(target.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll<HTMLButtonElement>("[data-select-item]");
      const target = items[focusedIndex];
      if (target) {
        target.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isOpen]);

  // Size configurations
  const sizeClasses = {
    sm: "h-8 px-2.5 text-caption rounded-lg",
    md: "h-10 px-3 py-2 text-body-sm rounded-xl",
  }[size];

  // Variant configurations
  const variantClasses = {
    default:
      "bg-bg-elevated-2 border-border-hairline-strong hover:border-accent/40 focus:border-accent focus:ring-1 focus:ring-accent/30 text-text-primary",
    subtle:
      "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18] focus:border-accent/50 text-text-primary",
    ghost:
      "bg-transparent border-transparent hover:bg-white/[0.04] text-text-secondary hover:text-text-primary",
  }[variant];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-caption font-medium text-text-secondary mb-1 flex items-center gap-1"
        >
          <span>{label}</span>
          {required && <span className="text-status-overdue">*</span>}
        </label>
      )}

      {/* Hidden input for standard form submission if name is provided */}
      {name && <input type="hidden" name={name} value={String(value)} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 border transition-all text-left outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${
          isOpen ? "border-accent ring-1 ring-accent/30" : ""
        } ${error ? "border-status-overdue" : ""} ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              !selectedOption ? "text-text-tertiary" : "text-text-primary font-medium"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 ml-1">{selectedOption.badge}</span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-text-tertiary shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-[11px] text-status-overdue mt-1">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } w-full min-w-[160px] max-h-60 overflow-y-auto rounded-xl bg-bg-elevated-2 border border-border-hairline-strong shadow-2xl p-1.5 z-50 animate-fade-in no-scrollbar ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${menuClassName}`}
          style={{
            boxShadow: "rgba(0, 0, 0, 0.4) 0px 10px 30px -5px, rgba(0, 0, 0, 0.2) 0px 4px 10px -2px",
          }}
        >
          {options.length === 0 ? (
            <div className="py-2 px-3 text-caption text-text-tertiary text-center italic">
              Tidak ada pilihan
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  data-select-item
                  disabled={option.disabled}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left text-body-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "bg-accent/15 text-accent font-semibold"
                      : isFocused
                      ? "bg-white/[0.07] text-text-primary"
                      : "text-text-primary hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {option.icon && (
                      <span className="shrink-0 flex items-center text-text-secondary">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{option.label}</span>
                        {option.badge && <span className="shrink-0">{option.badge}</span>}
                      </div>
                      {option.description && (
                        <p className="text-[11px] text-text-tertiary truncate mt-0.5 font-normal">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-accent shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
