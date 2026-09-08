import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-accent text-on-accent text-button-md rounded-md px-4 py-[10px] hover:bg-accent-pressed active:bg-accent-deep",
    secondary:
      "bg-transparent text-text-primary border border-border-hairline-strong text-button-md rounded-md px-4 py-[10px] hover:bg-bg-elevated-2",
    ghost:
      "bg-transparent text-text-secondary text-button-md rounded-sm px-3 py-2 hover:text-text-primary hover:bg-bg-elevated-2",
    danger:
      "bg-transparent text-status-overdue border border-status-overdue text-button-md rounded-md px-4 py-[10px] hover:bg-badge-bg-overdue",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonPrimary(props: Omit<ButtonProps, "variant">) {
  return <Button variant="primary" {...props} />;
}

export function ButtonSecondary(props: Omit<ButtonProps, "variant">) {
  return <Button variant="secondary" {...props} />;
}
