import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

const capabilityCards = [
  { label: "EVALUATIONS", title: "Structured" },
  { label: "INSIGHTS", title: "Actionable" },
  { label: "ACCESS", title: "Multi-Studio" },
] as const;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const resetEmail = searchParams.get("email") ?? "";
  const redirectPath = searchParams.get("redirect") ?? "";
  const signupConfirmation = searchParams.get("signup") === "confirm";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resetSuccess && resetEmail) {
      setEmail(resetEmail);
    }

    const prefilledEmail = searchParams.get("email");
    if (prefilledEmail && !resetSuccess) {
      setEmail(prefilledEmail);
    }

    if (!resetSuccess) return;

    const timeout = window.setTimeout(() => {
      setSearchParams({});
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [resetSuccess, resetEmail, searchParams, setSearchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(
        redirectPath.startsWith("/") ? redirectPath : "/dashboard",
        { replace: true },
      );
    } catch (err: unknown) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_28%,rgba(120,14,14,0.22),transparent_26%),radial-gradient(circle_at_86%_82%,rgba(92,14,14,0.10),transparent_24%),linear-gradient(180deg,#090b10_0%,#06080c_100%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] items-center gap-10 px-8 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 xl:px-16">
        <section className="hidden lg:block">
          <div className="mx-auto w-full max-w-[520px]">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/58">
              COACHMETRIC
            </div>

            <div className="mt-10 flex h-[96px] w-[96px] items-center justify-center bg-white/[0.02] shadow-[0_0_48px_rgba(220,38,38,0.12)]">
              <img
                src="/180x180.png"
                alt="CoachMetric"
                className="h-[72px] w-[72px] object-contain"
              />
            </div>

            <h1 className="mt-9 text-[clamp(44px,4.1vw,60px)] font-semibold leading-[0.98] tracking-[-0.06em] text-white">
              <>
                <span className="block whitespace-nowrap">Elevate coaching</span>
                <span className="block whitespace-nowrap">with real</span>
                <span className="block whitespace-nowrap">visibility.</span>
              </>
            </h1>

            <p className="mt-7 max-w-[29rem] text-[16px] leading-[1.7] text-white/64">
              CoachMetric gives leaders a clean system to evaluate performance,
              track development, and spot risk before it becomes a problem.
            </p>

            <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-3.5">
              {capabilityCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[18px] border border-white/[0.08] bg-white/[0.02] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/42">
                    {card.label}
                  </p>
                  <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em] text-white">
                    {card.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[448px]">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto flex h-[78px] w-[78px] items-center justify-center bg-white/[0.02] shadow-[0_0_42px_rgba(220,38,38,0.12)]">
                <img
                  src="/180x180.png"
                  alt="CoachMetric"
                  className="h-[58px] w-[58px] object-contain"
                />
              </div>
              <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/52">
                COACHMETRIC
              </p>
              <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                <>
                  <span className="block whitespace-nowrap">Elevate coaching</span>
                  <span className="block whitespace-nowrap">with real</span>
                  <span className="block whitespace-nowrap">visibility.</span>
                </>
              </h1>
              <p className="mx-auto mt-4 max-w-[30rem] text-sm leading-7 text-white/62">
                CoachMetric gives leaders a clean system to evaluate performance,
                track development, and spot risk before it becomes a problem.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(23,23,28,0.96),rgba(18,18,22,0.98))] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:p-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/34">
                WELCOME BACK
              </p>

              <h2 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.045em] text-white">
                Sign in
              </h2>

              <p className="mt-4 max-w-[28rem] text-[15px] leading-8 text-white/54">
                Access evaluations, training records, and studio performance in
                one place.
              </p>

              <form onSubmit={handleSubmit} className="mt-8">
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38"
                    >
                      EMAIL
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors duration-150 placeholder:text-white/20 focus:border-white/14"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label
                        htmlFor="password"
                        className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38"
                      >
                        PASSWORD
                      </label>

                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-[13px] text-white/42 transition hover:text-white/68"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors duration-150 placeholder:text-white/20 focus:border-white/14"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-[14px]">
                  <label className="inline-flex items-center gap-3 text-white/78">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#ff4d3d]"
                    />
                    Remember me
                  </label>

                  <span className="text-white/36">Secure session</span>
                </div>

                {resetSuccess ? (
                  <div className="mt-5 rounded-[16px] border border-emerald-500/18 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    Password updated successfully. Please sign in.
                  </div>
                ) : null}

                {signupConfirmation ? (
                  <div className="mt-5 rounded-[16px] border border-emerald-500/18 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    Check your email to confirm your account, then sign in to continue onboarding.
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-5 rounded-[16px] border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#ff4d3d] text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-[13px] text-white/28">
              Need an account?{" "}
              <Link
                to={`/signup${
                  searchParams.toString() ? `?${searchParams.toString()}` : ""
                }`}
                className="text-white/62 transition hover:text-white"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

