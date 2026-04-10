import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import homepageDocument from "@/content/coachmetric-homepage.html?raw";
import { useAuth } from "@/contexts/AuthContext";

const contactEmail = "support@coachmetric.io";

type BillingInterval = "monthly" | "annual";

type PricingPlan = {
  id: "starter" | "growth" | "enterprise";
  cardClassName: string;
  badge?: string;
  name: string;
  subtitle: string;
  features: string[];
  ctaLabel: string;
  ctaClassName: "btn-ghost" | "btn-red";
  contactHref?: string;
  monthly?: {
    price: string;
    suffix: string;
    ctaHref: string;
  };
  annual?: {
    price: string;
    suffix: string;
    helper: string;
    ctaHref: string;
  };
};

function buildBillingIntentHref(
  planKey: "starter" | "growth",
  billingInterval: BillingInterval,
) {
  return `/signup?plan=${planKey}&interval=${billingInterval}`;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    cardClassName: "starter",
    name: "Starter",
    subtitle: "For small operators establishing baseline structure",
    features: [
      "Up to 3 studio locations",
      "Standard evaluation templates",
      "Basic coach roster",
      "Manual evaluations only",
      "Limited action visibility",
      "30-day data history",
    ],
    ctaLabel: "Get started",
    ctaClassName: "btn-ghost",
    monthly: {
      price: "$99",
      suffix: "/ studio / mo",
      ctaHref: buildBillingIntentHref("starter", "monthly"),
    },
    annual: {
      price: "$79",
      suffix: "/ studio / mo",
      helper: "billed annually at $948 per studio",
      ctaHref: buildBillingIntentHref("starter", "annual"),
    },
  },
  {
    id: "growth",
    cardClassName: "growth",
    badge: "Most Popular",
    name: "Growth",
    subtitle: "For multi-location operators needing real operational control",
    features: [
      "4&#8211;15 studio locations",
      "Custom evaluation builder",
      "Full Action Center access",
      "Automated risk flags",
      "Performance trend visibility",
      "Coach-level insights",
      "Unlimited data history",
    ],
    ctaLabel: "Get started",
    ctaClassName: "btn-red",
    monthly: {
      price: "$249",
      suffix: "/ studio / mo",
      ctaHref: buildBillingIntentHref("growth", "monthly"),
    },
    annual: {
      price: "$199",
      suffix: "/ studio / mo",
      helper: "billed annually at $2,388 per studio",
      ctaHref: buildBillingIntentHref("growth", "annual"),
    },
  },
  {
    id: "enterprise",
    cardClassName: "enterprise",
    name: "Enterprise",
    subtitle: "For regional networks and franchise operations",
    features: [
      "16+ studio locations",
      "Full regional hierarchy & rollups",
      "Advanced role permissions",
      "API access & integrations",
      "Dedicated success manager",
      "Onboarding & rollout support",
    ],
    ctaLabel: "Talk to sales",
    ctaClassName: "btn-ghost",
    contactHref: `mailto:${contactEmail}?subject=CoachMetric%20Enterprise`,
  },
] as const;

const pricingSectionStyles = `
  .pricing-section {
    padding: 88px 24px 84px;
    background: linear-gradient(180deg, rgba(10,11,16,0) 0%, rgba(10,11,16,0.28) 18%, rgba(9,9,11,0.92) 100%);
  }

  .pricing-wrap {
    max-width: 1160px;
    margin: 0 auto;
  }

  .pricing-header {
    max-width: 760px;
    margin: 0 auto 44px;
    text-align: center;
  }

  .pricing-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 28px auto 0;
    padding: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    background: rgba(255,255,255,0.03);
  }

  .pricing-toggle-button {
    border: none;
    background: transparent;
    color: var(--text-2);
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .pricing-toggle-button:hover {
    color: var(--text-1);
  }

  .pricing-toggle-button.is-active {
    background: rgba(255,255,255,0.08);
    color: #fff;
    box-shadow: 0 10px 24px rgba(0,0,0,0.16);
  }

  .pricing-microcopy {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: rgba(245,245,245,0.58);
    text-align: center;
    margin: 24px auto 0;
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    align-items: stretch;
  }

  .pricing-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 460px;
    padding: 32px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.07);
    background: #121214;
    box-shadow: 0 18px 42px rgba(0,0,0,0.22);
  }

  .pricing-card.starter {
    background: #0f1013;
    border-color: rgba(255,255,255,0.045);
  }

  .pricing-card.growth {
    transform: translateY(-12px) scale(1.02);
    border-color: rgba(229,57,53,0.34);
    background: linear-gradient(180deg, rgba(24,24,29,0.98), rgba(18,18,22,0.99));
    box-shadow: 0 24px 64px rgba(0,0,0,0.36), 0 18px 44px rgba(229,57,53,0.12);
  }

  .pricing-card.enterprise {
    background: #121214;
    border-color: rgba(255,255,255,0.07);
  }

  .pricing-badge {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translate(-50%, -50%);
    background: var(--red);
    color: #fff;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pricing-plan {
    font-family: 'Sora', sans-serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-1);
    margin-bottom: 10px;
  }

  .pricing-subtitle {
    min-height: 48px;
    margin-bottom: 28px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-2);
  }

  .pricing-price-block {
    min-height: 92px;
    margin-bottom: 28px;
  }

  .pricing-price-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }

  .pricing-price {
    font-family: 'Sora', sans-serif;
    font-size: 50px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.05em;
    color: #fff;
  }

  .pricing-price-suffix {
    padding-bottom: 6px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--text-3);
    text-transform: uppercase;
  }

  .pricing-annual {
    margin-top: 10px;
    font-size: 13px;
    color: var(--text-2);
  }

  .pricing-helper {
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.55;
    color: var(--text-3);
  }

  .pricing-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
    margin-bottom: 28px;
  }

  .pricing-features li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: #e5e7eb;
    line-height: 1.55;
  }

  .pricing-features li::before {
    content: '';
    width: 6px;
    height: 6px;
    margin-top: 8px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--red);
  }

  .pricing-card.starter .pricing-features li::before {
    background: rgba(255,255,255,0.6);
  }

  .pricing-card .btn-ghost,
  .pricing-card .btn-red {
    width: 100%;
    justify-content: center;
  }

  .pricing-support {
    margin-top: 26px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 24px 26px;
    background: linear-gradient(90deg, #121214 0%, #1a1a1c 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .pricing-support-copy h3 {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .pricing-support-copy p {
    max-width: 640px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-2);
  }

  @media (max-width: 980px) {
    .pricing-grid {
      grid-template-columns: 1fr;
    }

    .pricing-card.growth {
      transform: none;
    }

    .pricing-support {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (max-width: 640px) {
    .pricing-section {
      padding: 72px 16px 64px;
    }

    .pricing-card {
      min-height: auto;
      padding: 26px 22px;
    }

    .pricing-price {
      font-size: 42px;
    }

    .pricing-toggle {
      width: 100%;
      justify-content: center;
    }

    .pricing-toggle-button {
      flex: 1;
    }
  }
`;

function renderPricingSectionMarkup(billingInterval: BillingInterval) {
  const starterInterval = billingInterval === "annual" ? pricingPlans[0].annual : pricingPlans[0].monthly;
  const growthInterval = billingInterval === "annual" ? pricingPlans[1].annual : pricingPlans[1].monthly;
  const intervalByPlanId = {
    starter: starterInterval,
    growth: growthInterval,
  } as const;

  const pricingCardsMarkup = pricingPlans
    .map((plan) => {
      const activeInterval =
        plan.id === "enterprise" ? null : intervalByPlanId[plan.id];

      const helperMarkup =
        billingInterval === "annual" && activeInterval?.helper
          ? `<div class="pricing-helper">${activeInterval.helper}</div>`
          : "";

      const ctaHref = activeInterval?.ctaHref ?? plan.contactHref ?? "#";

      return `
        <article class="pricing-card ${plan.cardClassName}" role="listitem">
          ${plan.badge ? `<div class="pricing-badge">${plan.badge}</div>` : ""}
          <div class="pricing-plan">${plan.name}</div>
          <p class="pricing-subtitle">${plan.subtitle}</p>
          <div class="pricing-price-block">
            ${
              activeInterval
                ? `
            <div class="pricing-price-row">
              <div class="pricing-price">${activeInterval.price}</div>
              <div class="pricing-price-suffix">${activeInterval.suffix}</div>
            </div>
            ${helperMarkup}
            `
                : `
            <div class="pricing-price-row">
              <div class="pricing-price">Custom</div>
            </div>
            `
            }
          </div>
          <ul class="pricing-features" role="list">
            ${plan.features.map((feature) => `<li>${feature}</li>`).join("")}
          </ul>
          <a href="${ctaHref}" class="${plan.ctaClassName}">${plan.ctaLabel}</a>
        </article>
      `;
    })
    .join("");

  return `
  <section class="pricing-section" id="pricing" aria-labelledby="pricing-headline">
    <div class="pricing-wrap">
      <div class="pricing-header">
        <div class="section-eyebrow" style="justify-content: center;" aria-hidden="true">
          <span class="section-eyebrow-line"></span>
          <span class="label">Pricing</span>
          <span class="section-eyebrow-line"></span>
        </div>
        <h2 class="section-headline" id="pricing-headline">Clear pricing for every stage of studio growth.</h2>
        <p class="section-body" style="font-size: 16px; margin: 0 auto;">
          Choose the level of control your operation needs, from baseline structure to regional performance oversight.
        </p>
        <div class="pricing-toggle" role="tablist" aria-label="Billing interval">
          <button
            type="button"
            class="pricing-toggle-button ${billingInterval === "monthly" ? "is-active" : ""}"
            data-billing-toggle="monthly"
            aria-selected="${billingInterval === "monthly"}"
          >
            Monthly
          </button>
          <button
            type="button"
            class="pricing-toggle-button ${billingInterval === "annual" ? "is-active" : ""}"
            data-billing-toggle="annual"
            aria-selected="${billingInterval === "annual"}"
          >
            Annual
          </button>
        </div>
        <p class="pricing-microcopy">Billed per studio location. Unlimited coaches. Unlimited evaluations.</p>
      </div>

      <div class="pricing-grid" role="list">
        ${pricingCardsMarkup}
      </div>

      <div class="pricing-support">
        <div class="pricing-support-copy">
          <h3>Custom support for large operators.</h3>
          <p>Enterprise is built for regional networks that need hierarchy, integration support, and rollout guidance across a larger footprint.</p>
        </div>
        <a href="mailto:${contactEmail}?subject=CoachMetric%20Enterprise" class="btn-red">Contact sales</a>
      </div>
    </div>
  </section>
`;
}

function extractTagContent(source: string, pattern: RegExp, fallback = "") {
  const match = source.match(pattern);
  return match?.[1]?.trim() ?? fallback;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  const { title, description, styles, bodyMarkup } = useMemo(() => {
    const pageTitle = extractTagContent(
      homepageDocument,
      /<title>([\s\S]*?)<\/title>/i,
      "CoachMetric",
    );
    const pageDescription = extractTagContent(
      homepageDocument,
      /<meta\s+name="description"\s+content="([\s\S]*?)"\s*\/?>/i,
      "CoachMetric",
    );
    const pageStyles = extractTagContent(
      homepageDocument,
      /<style>([\s\S]*?)<\/style>/i,
    );
    const pageBody = extractTagContent(
      homepageDocument,
      /<body[^>]*>([\s\S]*?)<\/body>/i,
    );

    const bodyWithPricing = pageBody
      .replaceAll('href="/pricing"', 'href="#pricing"')
      .replace(
        "  <!-- Final CTA -->",
        `${renderPricingSectionMarkup(billingInterval)}\n\n  <!-- Final CTA -->`,
      );

    return {
      title: pageTitle,
      description: pageDescription,
      styles: `${pageStyles}\n${pricingSectionStyles}`,
      bodyMarkup: bodyWithPricing,
    };
  }, [billingInterval]);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? null;

    document.title = title;

    if (descriptionTag) {
      descriptionTag.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    return () => {
      document.title = previousTitle;

      if (descriptionTag) {
        if (previousDescription !== null) {
          descriptionTag.setAttribute("content", previousDescription);
        } else {
          descriptionTag.removeAttribute("content");
        }
      }
    };
  }, [description, title]);

  useEffect(() => {
    function handleBillingToggle(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const toggle = target?.closest<HTMLElement>("[data-billing-toggle]");
      const nextInterval = toggle?.dataset.billingToggle;

      if (nextInterval === "monthly" || nextInterval === "annual") {
        setBillingInterval(nextInterval);
      }
    }

    document.addEventListener("click", handleBillingToggle);

    return () => {
      document.removeEventListener("click", handleBillingToggle);
    };
  }, []);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: bodyMarkup }} />
    </>
  );
}
