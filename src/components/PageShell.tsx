import type { ReactNode } from "react";
import PageHeader from "@/components/PageHeader";

type PageShellProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  showBack = false,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        actions={actions}
      />

      <div className="space-y-4">{children}</div>
    </div>
  );
}
