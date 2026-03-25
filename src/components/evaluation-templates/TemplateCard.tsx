import { Button } from "@/components/ui/button";

type Props = {
  template: {
    id: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    is_default?: boolean;
    version: number;
    updated_at: string;
    section_count: number;
    item_count: number;
  };
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onSetDefault: () => void | Promise<void>;
};

export default function TemplateCard({
  template,
  onEdit,
  onDelete,
  onSetDefault,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            Version {template.version}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {template.is_default ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              Default
            </span>
          ) : null}

          {template.is_active ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
              Active
            </span>
          ) : (
            <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
              Inactive
            </span>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {template.description || "No description provided."}
      </p>

      <div className="mb-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">Sections</div>
          <div className="mt-1 font-semibold text-foreground">
            {template.section_count}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">Items</div>
          <div className="mt-1 font-semibold text-foreground">
            {template.item_count}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">Updated</div>
          <div className="mt-1 font-semibold text-foreground">
            {new Date(template.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>

        {!template.is_default ? (
          <Button type="button" variant="outline" onClick={onSetDefault}>
            Set Default
          </Button>
        ) : null}

        <Button type="button" variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}