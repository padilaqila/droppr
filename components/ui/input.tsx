import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-caption font-semibold text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full h-10 bg-bg-elevated-2 text-text-primary text-body-sm px-4 py-3 rounded-md border border-border-hairline-strong focus:outline-none focus:border-2 focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors placeholder:text-text-disabled ${
            error ? "border-status-overdue focus:border-status-overdue" : ""
          } ${className}`.trim()}
          {...props}
        />
        {error && (
          <p className="text-caption text-status-overdue">{error}</p>
        )}
        {hint && !error && (
          <p className="text-caption text-text-tertiary">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
