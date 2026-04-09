import LegalPageLayout, {
  LegalContactBlock,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

const effectiveDate = "Effective Date: March 13, 2026";
const lastUpdated = "Last Updated: April 8, 2026";

export default function BillingPage() {
  return (
    <LegalPageLayout
      eyebrow="Billing and Subscription Terms"
      title="Billing and Subscription Terms"
      effectiveDate={effectiveDate}
      lastUpdated={lastUpdated}
    >
      <LegalSection title="1. BILLING MODEL">
        <p>
          CoachMetric may offer subscription-based access to all or part of the
          platform.
        </p>
        <p>
          Subscriptions may renew automatically unless canceled before the next
          renewal date.
        </p>
      </LegalSection>

      <LegalSection title="2. PAYMENTS">
        <p>
          Payments may be processed through Stripe or another authorized
          third-party payment provider.
        </p>
        <p>
          You authorize applicable recurring charges when subscribing to a paid
          plan.
        </p>
      </LegalSection>

      <LegalSection title="3. CANCELLATION">
        <p>You may cancel at any time.</p>
        <p>
          Unless otherwise stated, cancellation takes effect at the end of the
          current billing period.
        </p>
      </LegalSection>

      <LegalSection title="4. REFUNDS">
        <p>
          Fees are non-refundable except where expressly stated or required by
          law.
        </p>
      </LegalSection>

      <LegalSection title="5. FAILED PAYMENTS">
        <p>
          We may suspend or restrict access if payment cannot be successfully
          processed.
        </p>
      </LegalSection>

      <LegalSection title="6. PRICING CHANGES">
        <p>
          We may update pricing prospectively. Continued use after a pricing
          change takes effect constitutes acceptance of the updated pricing.
        </p>
      </LegalSection>

      <LegalSection title="7. CONTACT">
        <LegalContactBlock
          lines={[
            "CoachMetric",
            "San Francisco, California, United States",
            "support@coachmetric.io",
            "https://coachmetric.io",
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
