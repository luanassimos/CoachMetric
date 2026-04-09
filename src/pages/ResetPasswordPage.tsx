import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading, updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      setError("Invalid or expired reset link. Please request a new one.");
    }
  }, [loading, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      const email = session?.user?.email ?? "";

setTimeout(() => {
  navigate(`/login?reset=success&email=${encodeURIComponent(email)}`, {
    replace: true,
  });
}, 1500);
    } catch (err) {
      console.error(err);
      setError("We could not update your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,59,48,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,59,48,0.10),transparent_24%),linear-gradient(180deg,#0A0B10_0%,#07080B_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
          <div className="mb-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
              Account recovery
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Create a new password
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Choose a new password to secure your account.
            </p>
          </div>

          {success ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Password updated successfully.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-red-500/60 focus:bg-black/35"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                  Confirm new password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-red-500/60 focus:bg-black/35"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || loading || !session}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF453A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#ff5c52] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}