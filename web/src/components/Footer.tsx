import { Calculator } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-zinc-950/50 py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-300">ArchCalc</span>
        </div>
        <p className="text-center text-sm leading-loose text-zinc-400 md:text-left">
          Built with precision. The definitive workspace and dev tools platform.
        </p>
        <div className="flex gap-4">
          <Link
            href="/docs"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Docs
          </Link>
          <Link
            href="#"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
