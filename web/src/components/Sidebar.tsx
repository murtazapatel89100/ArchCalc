"use client";

import { type ClassValue, clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { siteConfig } from "@/config/site";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 p-4 border-r border-white/10 hidden md:block overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-lg text-white mb-2 px-2">
          Documentation
        </h3>
        <nav className="flex flex-col gap-1">
          {siteConfig.sidebar.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm transition-colors",
                pathname === link.href
                  ? "bg-blue-500/10 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/5",
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
