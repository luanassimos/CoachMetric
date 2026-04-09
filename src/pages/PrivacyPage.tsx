import LegalPageLayout, {
  LegalBulletList,
  LegalContactBlock,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

const effectiveDate = "Effective Date: March 13, 2026";
const lastUpdated = "Last Updated: April 8, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      effectiveDate={effectiveDate}
      lastUpdated={lastUpdated}
    >
      <LegalSection title="1. INFORMATION WE COLLECT">
        <p>We may collect:</p>
        <LegalBulletList
          items={[
            "name",
            "email",
            "account data",
            "performance and usage data",
            "device and log data",
            "studio-specific operational data submitted through the platform",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. HOW WE USE DATA">
        <p>We use data to:</p>
        <LegalBulletList
          items={[
            "provide the service",
            "improve the platform",
            "monitor performance and usage",
            "support analytics and operational insights",
            "maintain security and platform integrity",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. DATA STORAGE">
        <p>
          Data is stored using secure infrastructure providers such as Supabase
          and related cloud services used to operate the platform.
        </p>
      </LegalSection>

      <LegalSection title="4. DATA SHARING">
        <p>We do not sell personal data.</p>
        <p>We only share data with:</p>
        <LegalBulletList
          items={[
            "infrastructure providers",
            "authentication providers",
            "payment processors such as Stripe",
            "service providers necessary to operate the platform",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. DATA RETENTION">
        <p>
          We retain data as long as reasonably necessary to provide the service,
          comply with legal obligations, resolve disputes, and enforce
          agreements.
        </p>
        <p>Users may request deletion of eligible data at any time.</p>
      </LegalSection>

      <LegalSection title="6. SECURITY">
        <p>We implement:</p>
        <LegalBulletList
          items={[
            "authenticated access controls",
            "session controls",
            "encrypted connections via HTTPS",
            "reasonable technical and organizational safeguards",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. USER RIGHTS">
        <p>Users may request:</p>
        <LegalBulletList
          items={[
            "access to their data",
            "correction of inaccurate data",
            "deletion of eligible data",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. THIRD-PARTY SERVICES">
        <p>We use third-party providers to operate the service.</p>
        <p>Each provider has its own privacy and security policies.</p>
      </LegalSection>

      <LegalSection title="9. CHANGES">
        <p>We may update this Privacy Policy at any time.</p>
      </LegalSection>

      <LegalSection title="10. CONTACT">
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
