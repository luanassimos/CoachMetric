import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ReportIssueDialog({
  trigger,
}: {
  trigger: ReactNode;
}) {
  const { user } = useAuth();
  const { selectedStudioId } = useStudio();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit() {
    if (!user?.id) {
      setErrorMessage("You must be logged in to submit a report.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setErrorMessage("Please fill in the title and description.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase.from("bug_reports").insert({
        title: title.trim(),
        description: description.trim(),
        page_path: `${location.pathname}${location.search}`,
        studio_id: selectedStudioId && selectedStudioId !== "all" ? selectedStudioId : null,
        reported_by_user_id: user.id,
      });

      if (error) throw error;

      setSuccessMessage("Issue reported successfully.");
      setTitle("");
      setDescription("");

      window.setTimeout(() => {
        setOpen(false);
        setSuccessMessage("");
      }, 900);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit issue report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setErrorMessage("");
          setSuccessMessage("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report issue</DialogTitle>
          <DialogDescription>
            Report a bug or unexpected behavior for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the issue"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, what you expected, and where it happened"
              rows={6}
            />
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
            <div>Page: {location.pathname}{location.search}</div>
            <div>
              Studio: {selectedStudioId && selectedStudioId !== "all" ? selectedStudioId : "None"}
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-400">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-emerald-400">{successMessage}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}