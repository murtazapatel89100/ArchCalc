import { ArrowRight, Cpu, Download, Hash, Terminal } from "lucide-react";
import Link from "next/link";
import DownloadSection from "@/components/DownloadSection";

async function getLatestRelease() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/murtazapatel89100/ArchCalc/releases/latest",
      {
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return "v1.0.0";
    const data = await res.json();
    return data.tag_name || "v1.0.0";
  } catch (_error) {
    return "v1.0.0";
  }
}

async function getTotalDownloads() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/murtazapatel89100/ArchCalc/releases",
      {
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    let count = 0;
    for (const release of data) {
      for (const asset of release.assets) {
        count += asset.download_count || 0;
      }
    }
    return count;
  } catch (_error) {
    return 0;
  }
}

export default async function Home() {
  const latestVersion = await getLatestRelease();
  const totalDownloads = await getTotalDownloads();

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center w-full z-10 px-4 md:px-6">
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto py-24 md:py-32 lg:py-40 flex flex-col items-center text-center gap-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-blue-500/30 text-blue-300 text-sm font-medium">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              ArchCalc {latestVersion} is now live
            </div>
            {totalDownloads > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-purple-500/30 text-purple-300 text-sm font-medium">
                <Download className="h-4 w-4" />
                {totalDownloads.toLocaleString()} Total Downloads
              </div>
            )}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 max-w-4xl">
            A Blazing Fast <br className="hidden md:block" />
            <span className="text-gradient">Desktop Calculator</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-zinc-400">
            A lightweight, extensible desktop calculator built with Rust, Tauri,
            and SolidJS. Parse and evaluate complex mathematical expressions
            instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <Link
              href="/docs/getting-started"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 text-sm font-medium text-white transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-8 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
            >
              Documentation
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-6xl mx-auto py-20 md:py-32 border-t border-white/5">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powered by Rust
            </h2>
            <p className="text-zinc-400 max-w-2xl">
              ArchCalc combines a custom AST evaluator written in Rust with a
              beautifully responsive SolidJS UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Feature 1 */}
            <div className="glass-card relative p-8 rounded-2xl flex flex-col items-start text-left group hover:-translate-y-2 transition-all duration-300 border border-white/5 hover:border-blue-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10">
                <Terminal className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white relative z-10">
                Custom AST Evaluator
              </h3>
              <p className="text-zinc-400 text-base leading-relaxed relative z-10">
                Core logic for expression parsing and evaluation is built from
                scratch in Rust, guaranteeing maximum performance and memory
                safety.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card relative p-8 rounded-2xl flex flex-col items-start text-left group hover:-translate-y-2 transition-all duration-300 border border-white/5 hover:border-purple-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10">
                <Cpu className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white relative z-10">
                Tauri Framework
              </h3>
              <p className="text-zinc-400 text-base leading-relaxed relative z-10">
                Packaged using Tauri for a native desktop experience with a tiny
                footprint. Fast IPC bridge between the UI and Rust backend.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card relative p-8 rounded-2xl flex flex-col items-start text-left group hover:-translate-y-2 transition-all duration-300 border border-white/5 hover:border-emerald-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10">
                <Hash className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white relative z-10">
                Persistent History
              </h3>
              <p className="text-zinc-400 text-base leading-relaxed relative z-10">
                Your calculations are safely stored locally on your machine via
                the Rust file storage API, ensuring you never lose your work.
              </p>
            </div>
          </div>
        </section>

        <DownloadSection latestVersion={latestVersion} />
      </main>
    </div>
  );
}
