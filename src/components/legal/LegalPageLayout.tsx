import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  children: ReactNode;
};

const legalLinks = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/billing", label: "Billing" },
  { to: "/security", label: "Security" },
  { to: "/acceptable-use", label: "Acceptable Use" },
] as const;

function LegalNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all duration-150",
          isActive
            ? "border-white/12 bg-white/[0.06] text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
            : "border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/[0.03] hover:text-foreground",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <section className="scroll-mt-24 space-y-5" aria-labelledby={sectionId}>
      <h2
        id={sectionId}
        className="text-[13px] font-semibold uppercase tracking-[0.18em] text-foreground/95"
      >
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-[1.95] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3.5">
          <span className="mt-[0.95rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalContactBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line) => (
        <p key={line}>
          {line.includes("@") ? (
            <a
              href={`mailto:${line}`}
              className="text-foreground transition-colors hover:text-primary"
            >
              {line}
            </a>
          ) : line.startsWith("http") ? (
            <a
              href={line}
              className="text-foreground transition-colors hover:text-primary"
            >
              {line}
            </a>
          ) : (
            line
          )}
        </p>
      ))}
    </div>
  );
}

export default function LegalPageLayout({
  eyebrow,
  title,
  effectiveDate,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,69,58,0.055),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.01),transparent_22%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <img
                src="/180x180.png"
                alt="CoachMetric"
                className="h-7 w-7 object-contain opacity-95"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
                CoachMetric
              </p>
              <p className="truncate text-sm font-semibold tracking-tight text-foreground/95">
                Legal
              </p>
            </div>
          </Link>

          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap items-center gap-2"
          >
            {legalLinks.map((link) => (
              <LegalNavLink key={link.to} to={link.to} label={link.label} />
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[780px] flex-1">
          <article className="rounded-[28px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.01)_100%)] px-6 py-8 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-[14px] sm:px-10 sm:py-11 lg:px-12">
            <header className="mb-10 border-b border-white/[0.07] pb-8 sm:mb-12 sm:pb-10">
              <div className="surface-pill mb-6 border-primary/15 bg-primary/8 text-[11px] uppercase tracking-[0.14em] text-primary-foreground/90">
                {eyebrow}
              </div>
              <h1 className="max-w-[13ch] text-[40px] font-semibold tracking-[-0.035em] text-foreground sm:text-[52px] sm:leading-[1.02]">
                {title}
              </h1>
              <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
                <p>{effectiveDate}</p>
                <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
                <p>{lastUpdated}</p>
              </div>
            </header>

            <div className="space-y-10 [&>section:not(:first-child)]:border-t [&>section:not(:first-child)]:border-white/[0.06] [&>section:not(:first-child)]:pt-10 sm:space-y-12 sm:[&>section:not(:first-child)]:pt-12">
              {children}
            </div>
          </article>
        </main>

        <footer className="mx-auto mt-10 flex w-full max-w-[780px] flex-col gap-4 border-t border-white/[0.07] pt-6 text-center sm:mt-12 sm:gap-5 sm:text-left">
          <p className="text-sm text-muted-foreground/90">
            CoachMetric legal information, billing terms, and platform trust
            policies.
          </p>
          <nav
            aria-label="Footer legal navigation"
            className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
          >
            {legalLinks.map((link) => (
              <LegalNavLink key={link.to} to={link.to} label={link.label} />
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
