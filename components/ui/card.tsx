import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardBase({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-bg-elevated border border-border-hairline shadow-none p-5 transition-all ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardDashboardStat({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl bg-bg-elevated hover:bg-bg-elevated-2 border border-border-hairline hover:border-border-hairline-strong shadow-none p-4 sm:p-5 transition-all duration-150 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
