import { createPortal } from "react-dom";
import { X } from "lucide-react";

import EvaluationTemplateEditor from "@/components/EvaluationTemplateEditor";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  studioId: string;
  studioName?: string;
};

export default function TemplateEditorDrawer({
  open,
  onClose,
  studioId,
  studioName,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex justify-end">
        <div
          className="relative h-full w-full max-w-[1100px] border-l border-white/8 bg-background shadow-2xl shadow-black/40"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-20 border-b border-white/8 bg-background/90 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Template Management
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Manage Evaluation Templates
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Studio {studioName ?? studioId}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <EvaluationTemplateEditor
                studioId={studioId}
                studioName={studioName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}