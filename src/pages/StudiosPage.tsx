import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useStudios } from "@/hooks/useStudios";
import { useStudio } from "@/contexts/StudioContext";
import {
  createStudio,
  deleteStudio,
  updateStudio,
} from "@/data/supabaseStudios";
import type { Studio } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("surface-panel", className)}>{children}</div>;
}

type DraftState = {
  name: string;
  city: string;
  state: string;
};

function getDraftFromStudio(studio: Studio): DraftState {
  return {
    name: studio.name ?? "",
    city: studio.city ?? "",
    state: studio.state ?? "",
  };
}

export default function StudiosPage() {
    const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studios, loading } = useStudios();
  const { selectedStudioId, setSelectedStudioId } = useStudio();

  const [createDraft, setCreateDraft] = useState<DraftState>({
    name: "",
    city: "",
    state: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftState>({
    name: "",
    city: "",
    state: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.id === selectedStudioId) ?? null,
    [studios, selectedStudioId],
  );

  const createStudioMutation = useMutation({
    mutationFn: async () => {
      return createStudio({
        name: createDraft.name,
        city: createDraft.city,
        state: createDraft.state,
      });
    },
    onSuccess: async (createdStudio) => {
  setCreateDraft({ name: "", city: "", state: "" });
  await queryClient.invalidateQueries({ queryKey: ["studios"] });
  setSelectedStudioId(createdStudio.id);
},
  });

  const updateStudioMutation = useMutation({
  mutationFn: async ({
    id,
    payload,
  }: {
    id: string;
    payload: DraftState;
  }) => {
    return updateStudio(id, payload);
  },
  onSuccess: async () => {
    setEditingId(null);
    setEditingDraft({ name: "", city: "", state: "" });
    await queryClient.invalidateQueries({ queryKey: ["studios"] });
  },
});

  const deleteStudioMutation = useMutation<string, Error, string>({
  mutationFn: async (id: string) => {
    await deleteStudio(id);
    return id;
  },
  onSuccess: async (deletedId) => {
    setConfirmDeleteId(null);
    await queryClient.invalidateQueries({ queryKey: ["studios"] });

    if (selectedStudioId === deletedId) {
      navigate("/studios");
    }
  },
});

  const totalStudios = studios.length;
  const locationsCount = studios.filter(
    (studio) => (studio.city ?? "").trim() || (studio.state ?? "").trim(),
  ).length;

  const canCreate = createDraft.name.trim().length > 0;

  return (
    <div className="min-w-0 space-y-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Organization
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Studios
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage locations, keep studio naming clean, and control which
              studio is active across the product.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <MetricCard
              label="Total Studios"
              value={totalStudios}
              helper="Locations in workspace"
            />
            <MetricCard
              label="With Location Data"
              value={locationsCount}
              helper="City/state filled in"
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold">Create Studio</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a new studio to the organization and make it available across
              dashboard, coaches, training, and evaluations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_0.7fr_auto]">
            <input
              value={createDraft.name}
              onChange={(event) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Studio name"
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
            />

            <input
              value={createDraft.city}
              onChange={(event) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
              placeholder="City"
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
            />

            <input
              value={createDraft.state}
              onChange={(event) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  state: event.target.value,
                }))
              }
              placeholder="State"
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
            />

            <Button
              type="button"
              onClick={() => createStudioMutation.mutate()}
              disabled={!canCreate || createStudioMutation.isPending}
              className="h-11"
            >
              {createStudioMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Studio
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-3">
        {loading ? (
          <SurfaceCard className="p-8">
            <p className="text-sm text-muted-foreground">Loading studios...</p>
          </SurfaceCard>
        ) : studios.length === 0 ? (
          <SurfaceCard className="p-10">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No studios yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Create the first studio to activate filtering and organization
                across the platform.
              </p>
            </div>
          </SurfaceCard>
        ) : (
          studios.map((studio) => {
            const isSelected = studio.id === selectedStudioId;
            const isEditing = editingId === studio.id;
            const isConfirmingDelete = confirmDeleteId === studio.id;
            const isDeleting =
              deleteStudioMutation.isPending &&
              deleteStudioMutation.variables === studio.id;
            const isSaving =
              updateStudioMutation.isPending &&
              updateStudioMutation.variables?.id === studio.id;

            return (
              <SurfaceCard
                key={studio.id}
                className={cn(
                  "p-5 transition-all",
                  isSelected && "border-primary/20 bg-primary/[0.05]",
                )}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                       <Button
  type="button"
  variant="outline"
  onClick={() =>
    navigate(`/studios/${studio.id}/evaluation-templates?studio=${studio.id}`)
  }
>
  Templates
</Button>

                      {isSelected ? (
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          Active Studio
                        </span>
                      ) : null}
                    </div>

                    {!isEditing ? (
                      <div className="mt-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                          {studio.name}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[studio.city, studio.state]
                              .filter(Boolean)
                              .join(", ") || "No location set"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground">
                          Studio ID: {studio.id}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <input
                          value={editingDraft.name}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Studio name"
                          className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
                        />

                        <input
                          value={editingDraft.city}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              city: event.target.value,
                            }))
                          }
                          placeholder="City"
                          className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
                        />

                        <input
                          value={editingDraft.state}
                          onChange={(event) =>
                            setEditingDraft((prev) => ({
                              ...prev,
                              state: event.target.value,
                            }))
                          }
                          placeholder="State"
                          className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition focus:border-white/15"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditing ? (
                      <>
                        {!isSelected ? (
                          <Button
  type="button"
  variant="outline"
  onClick={() => {
  setSelectedStudioId(studio.id);
}}
>
  Set Active
</Button>
                        ) : (
                          <Button type="button" variant="outline" disabled>
                            Active
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingId(studio.id);
                            setEditingDraft(getDraftFromStudio(studio));
                            setConfirmDeleteId(null);
                          }}
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>

                        {!isConfirmingDelete ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setConfirmDeleteId(studio.id);
                              setEditingId(null);
                            }}
                            className="border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                            disabled={isSelected}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>

                            <Button
                              type="button"
                              onClick={() => deleteStudioMutation.mutate(studio.id)}
                              className="bg-red-600 text-white hover:bg-red-500"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Confirm Delete
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditingDraft({ name: "", city: "", state: "" });
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          onClick={() =>
                            updateStudioMutation.mutate({
                              id: studio.id,
                              payload: editingDraft,
                            })
                          }
                          disabled={
                            editingDraft.name.trim().length === 0 || isSaving
                          }
                        >
                          {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3">
                    <p className="text-xs text-primary">
                      This studio is currently driving filters across dashboard,
                      coaches, evaluations, and training.
                    </p>
                  </div>
                ) : null}

                {isConfirmingDelete && !isSelected ? (
                  <div className="mt-4 rounded-2xl border border-red-500/15 bg-red-500/[0.045] px-4 py-3">
                    <p className="text-xs text-red-200">
                      Delete is permanent. If this studio is referenced by
                      coaches, evaluations, templates, or training records, the
                      database may reject the action.
                    </p>
                  </div>
                ) : null}
              </SurfaceCard>
            );
          })
        )}
      </div>

      {selectedStudio ? (
        <SurfaceCard className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Current Selection
          </p>
          <h2 className="mt-2 text-lg font-semibold">{selectedStudio.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Current filters are scoped to{" "}
            {[selectedStudio.city, selectedStudio.state]
              .filter(Boolean)
              .join(", ") || selectedStudio.name}
            .
          </p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="surface-panel-soft rounded-2xl border border-white/6 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
        {label}
      </p>
      <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}