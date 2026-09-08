import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardBase({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-elevated border border-border-hairline rounded-lg p-lg ${className}`.trim()}
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
      className={`bg-bg-elevated border border-border-hairline rounded-lg p-md ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
