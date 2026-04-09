import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import { canAccessDevTools } from "@/lib/devAccess";

type BugReport = {
  id: string;
  title: string;
  description: string;
  page_path: string | null;
  studio_id: string | null;
  reported_by_user_id: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

export default function DevReportsPage() {
  const { globalRole } = useAuth();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolvedHistory, setShowResolvedHistory] = useState(false);

  const isAllowed = canAccessDevTools(globalRole);

  useEffect(() => {
    if (!isAllowed) return;

    async function fetchReports() {
      setLoading(true);

      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReports(data);
      }

      setLoading(false);
    }

    fetchReports();
  }, [isAllowed]);

  async function updateStatus(
    reportId: string,
    status: "open" | "in_progress" | "resolved",
  ) {
    const previousReports = reports;

    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status } : report,
      ),
    );

    const { error } = await supabase
      .from("bug_reports")
      .update({ status })
      .eq("id", reportId);

    if (error) {
      setReports(previousReports);
      console.error("Failed to update bug report status:", error);
      toast.error(error.message || "Failed to update bug report");
      return;
    }

    if (status === "resolved") {
      toast.success("Bug report moved to resolved history");
      return;
    }

    toast.success("Bug report updated");
  }

  const activeReports = useMemo(
    () => reports.filter((report) => report.status !== "resolved"),
    [reports],
  );

  const resolvedReports = useMemo(
    () => reports.filter((report) => report.status === "resolved"),
    [reports],
  );

  if (!isAllowed) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">
          You are not authorized to view this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <PageShell
      title="Bug Reports"
      subtitle="View active issues and keep resolved reports in history"
      showBack
    >
      {activeReports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports yet.</p>
      ) : (
        <div className="space-y-4">
          {activeReports.map((report) => (
            <div
              key={report.id}
              className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{report.title}</h2>
                  <div className="mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="w-[160px] shrink-0">
                  <Select
                    value={report.status}
                    onValueChange={(value) =>
                      updateStatus(
                        report.id,
                        value as "open" | "in_progress" | "resolved",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {report.description}
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Page: {report.page_path || "N/A"}</div>
                <div>Studio: {report.studio_id || "N/A"}</div>
                <div>User: {report.reported_by_user_id}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Resolved History</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Resolved reports leave the active queue and stay here as read-only history.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowResolvedHistory((current) => !current)}
          >
            {showResolvedHistory ? "Hide History" : "Show History"}
          </Button>
        </div>

        {showResolvedHistory ? (
          resolvedReports.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No resolved reports yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {resolvedReports.map((report) => (
                <div
                  key={report.id}
                  className="space-y-2 rounded-xl border border-white/8 bg-black/10 p-4 opacity-75"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{report.title}</h3>
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                      Resolved
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Page: {report.page_path || "N/A"}</div>
                    <div>Studio: {report.studio_id || "N/A"}</div>
                    <div>User: {report.reported_by_user_id}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </PageShell>
  );
}
