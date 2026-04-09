import LegalPageLayout, {
  LegalBulletList,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

const effectiveDate = "Effective Date: March 13, 2026";
const lastUpdated = "Last Updated: April 8, 2026";

export default function SecurityPage() {
  return (
    <LegalPageLayout
      eyebrow="Security"
      title="Security"
      effectiveDate={effectiveDate}
      lastUpdated={lastUpdated}
    >
      <LegalSection title="SECURITY">
        <p>CoachMetric is built with security as a priority.</p>
        <p>We use security practices that may include:</p>
        <LegalBulletList
          items={[
            "secure authentication",
            "encrypted data transmission via HTTPS",
            "session timeout controls",
            "restricted data access",
            "logical separation of studio data within the platform",
          ]}
        />
        <p>
          We continuously improve our security practices as the platform
          evolves.
        </p>
        <p>
          No method of transmission or storage is completely secure, and we
          cannot guarantee absolute security.
        </p>
        <p>For security-related inquiries:</p>
        <p>support@coachmetric.io</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
