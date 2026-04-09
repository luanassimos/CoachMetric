import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-4 flex items-start justify-between gap-3 md:mb-6 md:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              ← 
            </Button>
          )}

          <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">
            {title}
          </h1>
        </div>

        {subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">{subtitle}</p>
        ) : null}
      </div>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
