import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-zinc-950/50 py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="ArchCalc Logo"
            width={20}
            height={20}
            className="h-5 w-5 object-contain opacity-70 grayscale"
          />
          <span className="text-sm font-semibold text-zinc-300">
            {siteConfig.name}
          </span>
        </div>
        <p className="text-center text-sm leading-loose text-zinc-400 md:text-left">
          {siteConfig.description}
        </p>
        <div className="flex gap-4">
          <Link
            href={siteConfig.links.docs}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Docs
          </Link>
          <Link
            href={siteConfig.links.privacy}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Privacy
          </Link>
          <Link
            href={siteConfig.links.terms}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
