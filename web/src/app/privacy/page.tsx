import { siteConfig } from "@/config/site";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-24 max-w-4xl prose prose-invert prose-blue">
      <h1>Privacy Policy</h1>
      <p className="lead">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to {siteConfig.name}. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you visit
        our website and use our application.
      </p>

      <h2>2. Information Collection</h2>
      <p>
        As a desktop application and developer tool platform, {siteConfig.name}{" "}
        is designed to run locally on your machine. We do not collect personal
        data, telemetry, or system information unless explicitly configured or
        opted-in by the user for crash reporting.
      </p>

      <h2>3. Data Security</h2>
      <p>
        We use administrative, technical, and physical security measures to help
        protect any personal information you provide. Because the majority of
        operations happen locally, your data remains secure on your own
        hardware.
      </p>

      <h2>4. Changes to This Privacy Policy</h2>
      <p>
        We may update our Privacy Policy from time to time. We will notify you
        of any changes by posting the new Privacy Policy on this page.
      </p>

      <h2>5. Contact Us</h2>
      <p>
        If you have questions or comments about this Privacy Policy, please open
        an issue on our{" "}
        <a href={siteConfig.links.github} target="_blank" rel="noreferrer">
          GitHub repository
        </a>
        .
      </p>
    </div>
  );
}
