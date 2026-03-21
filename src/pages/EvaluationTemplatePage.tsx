import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import TemplateEditorDrawer from "@/components/TemplateEditorDrawer";
import { useStudios } from "@/hooks/useStudios";

export default function EvaluationTemplatePage() {
  const navigate = useNavigate();
  const { studioId = "" } = useParams();
  const { studios, loading } = useStudios();
  const [drawerOpen, setDrawerOpen] = useState(true);

  const studio = useMemo(
    () => studios.find((item) => item.id === studioId) ?? null,
    [studios, studioId]
  );

  if (loading) {
    return <div className="p-6">Loading template page...</div>;
  }

  if (!studioId) {
    return <div className="p-6">Missing studio id.</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Template Admin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open the template drawer for this studio
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>

            <Button onClick={() => setDrawerOpen(true)}>
              Open Template Drawer
            </Button>
          </div>
        </div>
      </div>

      <TemplateEditorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        studioId={studioId}
        studioName={studio?.name ?? studioId}
      />
    </>
  );
}