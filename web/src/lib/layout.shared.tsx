import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { siteConfig } from "@/config/site";

/**
 * Shared layout options for Fumadocs layouts (docs nav, GitHub link, etc.).
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image
            src="/logo.png"
            alt="ArchCalc Logo"
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
          <span className="font-semibold">{siteConfig.name}</span>
        </>
      ),
      url: "/",
    },
    githubUrl: siteConfig.links.github,
  };
}
