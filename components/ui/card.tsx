import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardBase({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 ${className}`.trim()}
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
      className={`rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] p-4 transition-all duration-200 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
