import LegalPageLayout, {
  LegalBulletList,
  LegalContactBlock,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

const effectiveDate = "Effective Date: March 13, 2026";
const lastUpdated = "Last Updated: April 8, 2026";

export default function AcceptableUsePage() {
  return (
    <LegalPageLayout
      eyebrow="Acceptable Use Policy"
      title="Acceptable Use Policy"
      effectiveDate={effectiveDate}
      lastUpdated={lastUpdated}
    >
      <LegalSection title="ACCEPTABLE USE POLICY">
        <p>You may not use CoachMetric to:</p>
        <LegalBulletList
          items={[
            "attempt unauthorized access to any account, data, or studio environment",
            "interfere with platform integrity or performance",
            "upload malware, malicious scripts, or harmful code",
            "reverse engineer or attempt to extract source code",
            "use the platform for unlawful, fraudulent, or abusive purposes",
            "misuse analytics, reporting, or data in a deceptive or harmful way",
          ]}
        />
        <p>
          Violation of this policy may result in suspension or termination of
          access.
        </p>
        <p>For questions:</p>
        <LegalContactBlock
          lines={["support@coachmetric.io", "https://coachmetric.io"]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
