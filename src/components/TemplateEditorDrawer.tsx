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
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 pointer-events-none flex justify-end">
        <div
          className="pointer-events-auto relative h-full w-full max-w-6xl border-l bg-background shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold">
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
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <EvaluationTemplateEditor
                studioId={studioId}
                studioName={studioName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}