import LegalPageLayout, {
  LegalBulletList,
  LegalContactBlock,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

const effectiveDate = "Effective Date: March 13, 2026";
const lastUpdated = "Last Updated: April 8, 2026";

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Terms of Service"
      title="Terms of Service"
      effectiveDate={effectiveDate}
      lastUpdated={lastUpdated}
    >
      <LegalSection title="1. INTRODUCTION">
        <p>
          CoachMetric is a software platform designed to provide performance
          tracking, coach analytics, and operational insights for fitness
          studios.
        </p>
        <p>
          By accessing or using the platform, you agree to be bound by these
          Terms of Service. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. OPERATOR">
        <p>CoachMetric is an independently operated software service.</p>
      </LegalSection>

      <LegalSection title="3. SERVICE DESCRIPTION">
        <p>CoachMetric provides tools to:</p>
        <LegalBulletList
          items={[
            "track coach performance",
            "analyze operational data",
            "generate operational and performance insights",
          ]}
        />
        <p>We may update, modify, or discontinue features at any time.</p>
      </LegalSection>

      <LegalSection title="4. ACCOUNT">
        <p>You are responsible for:</p>
        <LegalBulletList
          items={[
            "maintaining account security",
            "all activity under your account",
            "ensuring authorized users within your organization use the platform appropriately",
          ]}
        />
        <p>We may suspend accounts that:</p>
        <LegalBulletList
          items={[
            "misuse the platform",
            "violate these Terms",
            "create security or operational risk",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. ACCEPTABLE USE">
        <p>You agree not to:</p>
        <LegalBulletList
          items={[
            "misuse or attempt to break the system",
            "access data from other studios without authorization",
            "reverse engineer the platform",
            "use the service for illegal purposes",
            "upload malicious code or harmful content",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. DATA AND PRIVACY">
        <p>You retain ownership of your data.</p>
        <p>
          We process and store data solely to provide, maintain, secure, and
          improve the service.
        </p>
        <p>See the Privacy Policy for full details.</p>
      </LegalSection>

      <LegalSection title="7. BILLING">
        <LegalBulletList
          items={[
            "subscriptions may be billed on a recurring basis",
            "payments may be processed via Stripe",
            "all payments are non-refundable unless expressly stated otherwise or required by law",
            "you may cancel at any time",
            "access remains active until the end of the current billing cycle unless otherwise stated",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. SERVICE AVAILABILITY">
        <p>The service is provided “as is” and “as available.”</p>
        <p>We do not guarantee:</p>
        <LegalBulletList
          items={[
            "uninterrupted uptime",
            "error-free operation",
            "specific business outcomes",
          ]}
        />
      </LegalSection>

      <LegalSection title="9. LIMITATION OF LIABILITY">
        <p>
          To the maximum extent permitted by law, CoachMetric shall not be liable
          for:
        </p>
        <LegalBulletList
          items={[
            "indirect damages",
            "loss of revenue",
            "loss of data",
            "business interruption",
            "consequential damages arising from use of the platform",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. TERMINATION">
        <p>We may suspend or terminate access at any time for:</p>
        <LegalBulletList
          items={[
            "violations of these Terms",
            "misuse",
            "payment failure",
            "security risks",
          ]}
        />
      </LegalSection>

      <LegalSection title="11. INTELLECTUAL PROPERTY">
        <p>
          All software, branding, systems, designs, and related intellectual
          property are owned by CoachMetric.
        </p>
        <p>
          Users are granted a limited, non-transferable, revocable license to
          use the platform.
        </p>
      </LegalSection>

      <LegalSection title="12. MODIFICATIONS">
        <p>We may update these Terms at any time.</p>
        <p>
          Continued use of the service after updates constitutes acceptance of
          the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. GOVERNING LAW">
        <p>
          These Terms are governed by the laws of the United States and the
          State of California, without regard to conflict of law principles.
        </p>
      </LegalSection>

      <LegalSection title="14. CONTACT">
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
