import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";

import homepageDocument from "@/content/coachmetric-homepage.html?raw";
import { useAuth } from "@/contexts/AuthContext";

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
  }
`;

const pricingSectionMarkup = `
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
        <p class="pricing-microcopy">Billed per studio location. Unlimited coaches. Unlimited evaluations.</p>
      </div>

      <div class="pricing-grid" role="list">
        <article class="pricing-card starter" role="listitem">
          <div class="pricing-plan">Starter</div>
          <p class="pricing-subtitle">For small operators establishing baseline structure</p>
          <div class="pricing-price-block">
            <div class="pricing-price-row">
              <div class="pricing-price">$99</div>
              <div class="pricing-price-suffix">/ studio / mo</div>
            </div>
            <div class="pricing-annual">$79 annual</div>
          </div>
          <ul class="pricing-features" role="list">
            <li>Up to 3 studio locations</li>
            <li>Standard evaluation templates</li>
            <li>Basic coach roster</li>
            <li>Manual evaluations only</li>
            <li>Limited action visibility</li>
            <li>30-day data history</li>
          </ul>
          <a href="mailto:coachmetric.gmail.com?subject=CoachMetric%20Starter%20trial" class="btn-ghost">Start free trial</a>
        </article>

        <article class="pricing-card growth" role="listitem">
          <div class="pricing-badge">Most Popular</div>
          <div class="pricing-plan">Growth</div>
          <p class="pricing-subtitle">For multi-location operators needing real operational control</p>
          <div class="pricing-price-block">
            <div class="pricing-price-row">
              <div class="pricing-price">$249</div>
              <div class="pricing-price-suffix">/ studio / mo</div>
            </div>
            <div class="pricing-annual">$199 annual</div>
          </div>
          <ul class="pricing-features" role="list">
            <li>4&#8211;15 studio locations</li>
            <li>Custom evaluation builder</li>
            <li>Full Action Center access</li>
            <li>Automated risk flags</li>
            <li>Performance trend visibility</li>
            <li>Coach-level insights</li>
            <li>Unlimited data history</li>
          </ul>
          <a href="mailto:coachmetric.gmail.com?subject=CoachMetric%207-day%20trial" class="btn-red">Start 7-day trial</a>
        </article>

        <article class="pricing-card enterprise" role="listitem">
          <div class="pricing-plan">Enterprise</div>
          <p class="pricing-subtitle">For regional networks and franchise operations</p>
          <div class="pricing-price-block">
            <div class="pricing-price-row">
              <div class="pricing-price">Custom</div>
            </div>
          </div>
          <ul class="pricing-features" role="list">
            <li>16+ studio locations</li>
            <li>Full regional hierarchy & rollups</li>
            <li>Advanced role permissions</li>
            <li>API access & integrations</li>
            <li>Dedicated success manager</li>
            <li>Onboarding & rollout support</li>
          </ul>
          <a href="mailto:coachmetric.gmail.com?subject=CoachMetric%20Enterprise" class="btn-ghost">Talk to sales</a>
        </article>
      </div>

      <div class="pricing-support">
        <div class="pricing-support-copy">
          <h3>Custom support for large operators.</h3>
          <p>Enterprise is built for regional networks that need hierarchy, integration support, and rollout guidance across a larger footprint.</p>
        </div>
        <a href="mailto:coachmetric.gmail.com?subject=CoachMetric%20Enterprise" class="btn-red">Contact sales</a>
      </div>
    </div>
  </section>
`;

function extractTagContent(source: string, pattern: RegExp, fallback = "") {
  const match = source.match(pattern);
  return match?.[1]?.trim() ?? fallback;
}

export default function HomePage() {
  const { user, loading } = useAuth();

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
      .replace("  <!-- Final CTA -->", `${pricingSectionMarkup}\n\n  <!-- Final CTA -->`);

    return {
      title: pageTitle,
      description: pageDescription,
      styles: `${pageStyles}\n${pricingSectionStyles}`,
      bodyMarkup: bodyWithPricing,
    };
  }, []);

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
