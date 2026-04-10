import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  isSelfServeBillingInterval,
  isSelfServePlan,
  SELF_SERVE_PLAN_COPY,
} from "@/lib/selfServeOnboarding";

function buildOnboardingRedirect(params: {
  plan: string | null;
  interval: string | null;
}) {
  const query = new URLSearchParams();
  if (isSelfServePlan(params.plan)) {
    query.set("plan", params.plan);
  }
  if (isSelfServeBillingInterval(params.interval)) {
    query.set("interval", params.interval);
  }

  const search = query.toString();
  return search ? `/onboarding?${search}` : "/onboarding";
}

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");
  const interval = searchParams.get("interval");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestSignIn, setSuggestSignIn] = useState(false);

  const planCopy = useMemo(
    () => (isSelfServePlan(plan) ? SELF_SERVE_PLAN_COPY[plan] : null),
    [plan],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setSuggestSignIn(false);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp({
        fullName,
        email,
        password,
      });

      const redirectPath = buildOnboardingRedirect({ plan, interval });

      if (result.needsEmailVerification) {
        navigate(
          `/login?signup=confirm&email=${encodeURIComponent(
            email,
          )}&redirect=${encodeURIComponent(redirectPath)}`,
          { replace: true },
        );
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (signupError) {
      const message =
        signupError instanceof Error
          ? signupError.message
          : "Unable to create your account.";

      setError(message);
      setSuggestSignIn(
        message.toLowerCase().includes("already exists") ||
          message.toLowerCase().includes("sign in instead") ||
          message.toLowerCase().includes("confirming your email"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_28%,rgba(120,14,14,0.22),transparent_26%),radial-gradient(circle_at_86%_82%,rgba(92,14,14,0.10),transparent_24%),linear-gradient(180deg,#090b10_0%,#06080c_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-6 py-10 lg:px-12">
        <div className="grid w-full gap-10 lg:grid-cols-[0.96fr_1.04fr]">
          <section className="hidden lg:block">
            <div className="max-w-[500px]">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/58">
                COACHMETRIC
              </div>

              <h1 className="mt-8 text-[clamp(40px,4.2vw,58px)] font-semibold leading-[0.98] tracking-[-0.06em] text-white">
                Launch your own
                <span className="block">studio workspace.</span>
              </h1>

              <p className="mt-6 max-w-[28rem] text-[16px] leading-[1.75] text-white/62">
                Self-serve onboarding creates a new CoachMetric workspace for your organization and keeps billing attached to your own studios only.
              </p>

              {planCopy ? (
                <div className="mt-8 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
                    Selected plan
                  </p>
                  <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-white">
                    {planCopy.label}
                  </h2>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-white/42">
                    {planCopy.eyebrow}
                  </p>
                  <p className="mt-4 text-[15px] leading-7 text-white/58">
                    {planCopy.description}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mx-auto flex w-full max-w-[460px] items-center lg:ml-auto">
            <div className="w-full rounded-[28px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(23,23,28,0.96),rgba(18,18,22,0.98))] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:p-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/34">
                CREATE ACCOUNT
              </p>
              <h2 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.045em] text-white">
                Start CoachMetric
              </h2>
              <p className="mt-4 text-[15px] leading-8 text-white/54">
                Create your account, set up your own studios, and continue directly into billing.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    FULL NAME
                  </label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                    className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                    required
                  />
                </div>

                <div>
                  <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                    required
                  />
                </div>

                <div>
                  <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                    required
                  />
                </div>

                <div>
                  <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                    className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                    required
                  />
                </div>

                {error ? (
                  <div className="rounded-[16px] border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                    {suggestSignIn ? (
                      <div className="mt-2">
                        <Link
                          to={`/login?email=${encodeURIComponent(email)}${
                            searchParams.toString()
                              ? `&${searchParams.toString()}`
                              : ""
                          }`}
                          className="text-red-100 underline underline-offset-4 hover:text-white"
                        >
                          Go to Sign in
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#ff4d3d] text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account
                    </>
                  ) : (
                    <>
                      Continue to onboarding
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/40">
                Already have an account?{" "}
                <Link
                  to={`/login${
                    searchParams.toString() ? `?${searchParams.toString()}` : ""
                  }`}
                  className="text-white/75 transition hover:text-white"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
