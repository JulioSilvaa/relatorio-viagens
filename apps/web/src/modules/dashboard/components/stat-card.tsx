import type { ReactNode } from "react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

const TONE_CLASSES = {
  neutral: {
    icon: "bg-muted text-muted-foreground",
    featuredIcon: "bg-muted text-muted-foreground",
    featured: "",
  },
  warning: {
    icon: "bg-warning/15 text-warning",
    featuredIcon: "bg-warning text-white",
    featured: "bg-warning/15 ring-1 ring-warning/30",
  },
  info: {
    icon: "bg-info/15 text-info",
    featuredIcon: "bg-info text-white",
    featured: "bg-info/15 ring-1 ring-info/30",
  },
  success: {
    icon: "bg-success/15 text-success",
    featuredIcon: "bg-success text-white",
    featured: "bg-success/15 ring-1 ring-success/30",
  },
} as const;

type StatCardTone = keyof typeof TONE_CLASSES;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  featured = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: StatCardTone;
  featured?: boolean;
  className?: string;
}) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <Card className={cn(featured && toneClasses.featured, className)}>
      <CardContent
        className={cn(
          "flex h-full flex-col justify-between gap-3 p-4",
          featured && "sm:p-6",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium text-muted-foreground",
              featured && "sm:text-base",
            )}
          >
            {label}
          </span>
          {icon ? (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                featured ? toneClasses.featuredIcon : toneClasses.icon,
                featured && "sm:size-10",
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <div>
          <p
            className={cn(
              "text-2xl leading-none font-semibold tracking-tight tabular-nums text-foreground",
              featured && "sm:text-4xl",
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
