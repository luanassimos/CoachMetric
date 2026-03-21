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

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full max-w-6xl bg-background border-l shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold">Manage Evaluation Templates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Studio {studioName ?? studioId}
              </p>
            </div>

            <Button variant="outline" size="icon" onClick={onClose}>
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
  );
}