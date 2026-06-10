import {
  ArrowRight,
  Cpu,
  Download,
  Hash,
  Package,
  Terminal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  } catch (error) {
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
  } catch (error) {
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
            The Definitive <br className="hidden md:block" />
            <span className="text-gradient">Workspace Platform</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-zinc-400">
            Empower your workflow with advanced system reading, comprehensive
            developer tools, and an integrated workspace environment designed
            for maximum efficiency.
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
              Everything you need, built-in.
            </h2>
            <p className="text-zinc-400 max-w-2xl">
              ArchCalc combines essential development utilities into a single,
              cohesive interface.
            </p>
          </div>

          <div className="flex flex-col gap-12">
            {/* Feature 1 */}
            <div className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-16 text-left group hover:-translate-y-1 transition-all">
              <div className="flex-1 flex flex-col items-start">
                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
                  <Terminal className="h-8 w-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">
                  Advanced Workspace
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                  A unified environment to manage your projects, execute
                  commands, and orchestrate tasks without ever leaving the
                  application.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <Image
                    src="/images/workspace.png"
                    alt="Workspace Feature"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 md:p-12 flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16 text-left group hover:-translate-y-1 transition-all">
              <div className="flex-1 flex flex-col items-start">
                <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-transform">
                  <Cpu className="h-8 w-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">
                  System Reading
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                  Deep integration with host systems. Read metrics, analyze
                  architecture, and monitor performance in real-time.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <Image
                    src="/images/system.png"
                    alt="System Reading Feature"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-16 text-left group hover:-translate-y-1 transition-all">
              <div className="flex-1 flex flex-col items-start">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform">
                  <Hash className="h-8 w-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-white">
                  Developer Tools
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                  Built-in utilities for hashing, encoding, decoding, and data
                  transformation. The tools you use every day, instantly
                  accessible.
                </p>
              </div>
              <div className="flex-1 w-full">
                <div className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <Image
                    src="/images/devtools.png"
                    alt="Dev Tools Feature"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Downloads Section */}
        <section className="w-full max-w-6xl mx-auto py-20 md:py-32 border-t border-white/5">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Install ArchCalc
            </h2>
            <p className="text-zinc-400 max-w-2xl">
              Available for your favorite Linux distributions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
            {/* Direct Download Card */}
            <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all">
              <div className="h-16 w-16 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-zinc-400 mb-6 group-hover:scale-110 transition-transform">
                <Download className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">
                Direct Download
              </h3>
              <p className="text-zinc-400 mb-6 flex-1">
                Download pre-compiled binaries from GitHub.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Link
                  href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc_${latestVersion.replace("v", "")}_amd64.deb`}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/5"
                >
                  Download .deb
                </Link>
                <Link
                  href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc-${latestVersion.replace("v", "")}-1.x86_64.rpm`}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/5"
                >
                  Download .rpm
                </Link>
              </div>
            </div>

            {/* AUR Card */}
            <Link
              href="https://aur.archlinux.org/packages/archcalc"
              target="_blank"
              className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all"
            >
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">
                Arch User Repository
              </h3>
              <p className="text-zinc-400 mb-6 flex-1">
                Install via your favorite AUR helper.
              </p>
              <code className="bg-black/30 px-4 py-2 rounded-lg w-full text-blue-300 font-mono text-sm border border-white/5 group-hover:border-blue-500/30 transition-colors">
                yay -S archcalc
              </code>
            </Link>

            {/* Flatpak Card */}
            <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all opacity-80 cursor-not-allowed">
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 mb-6 group-hover:scale-110 transition-transform">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Flatpak</h3>
              <p className="text-zinc-400 mb-6 flex-1">
                Coming soon to Flathub.
              </p>
              <code className="bg-black/30 px-4 py-2 rounded-lg w-full text-zinc-500 font-mono text-sm border border-white/5">
                flatpak install archcalc
              </code>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
