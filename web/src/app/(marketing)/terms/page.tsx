import { siteConfig } from "@/config/site";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-24 max-w-4xl prose">
      <h1>Terms of Service</h1>
      <p className="lead">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing or using {siteConfig.name}, you agree to be bound by these
        Terms of Service and all applicable laws and regulations.
      </p>

      <h2>2. Use License</h2>
      <p>
        {siteConfig.name} is provided under an open-source license. Please refer
        to the LICENSE file in our{" "}
        <a href={siteConfig.links.github} target="_blank" rel="noreferrer">
          GitHub repository
        </a>{" "}
        for specific terms regarding modification, distribution, and commercial
        use.
      </p>

      <h2>3. Disclaimer</h2>
      <p>
        The materials and tools within {siteConfig.name} are provided on an
        &apos;as is&apos; basis. We make no warranties, expressed or implied,
        and hereby disclaim and negate all other warranties including, without
        limitation, implied warranties or conditions of merchantability, fitness
        for a particular purpose, or non-infringement of intellectual property
        or other violation of rights.
      </p>

      <h2>4. Limitations</h2>
      <p>
        In no event shall {siteConfig.name} or its contributors be liable for
        any damages (including, without limitation, damages for loss of data or
        profit, or due to business interruption) arising out of the use or
        inability to use the software.
      </p>

      <h2>5. Governing Law</h2>
      <p>
        These terms and conditions are governed by and construed in accordance
        with standard open-source community guidelines.
      </p>
    </div>
  );
}
