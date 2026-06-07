import { Book, Calculator } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Calculator className="h-6 w-6 text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-white">
            ArchCalc
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-sm font-medium">
          <Link
            href="/docs"
            className="text-zinc-300 transition-colors hover:text-white flex items-center gap-2"
          >
            <Book className="h-4 w-4" />
            <span className="hidden sm:inline">Documentation</span>
          </Link>
          <a
            href="https://github.com/murtazapatel89100/ArchCalc"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <title>GitHub</title>
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span className="sr-only">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
