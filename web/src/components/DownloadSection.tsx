"use client";

import { Download, Monitor, Package, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Platform = "auto" | "windows" | "linux" | "all";

export default function DownloadSection({
  latestVersion,
}: {
  latestVersion: string;
}) {
  const [platform, setPlatform] = useState<Platform>("auto");
  const [detectedOS, setDetectedOS] = useState<"windows" | "linux" | "unknown">(
    "unknown",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Basic OS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) {
      setDetectedOS("windows");
    } else if (userAgent.includes("linux") && !userAgent.includes("android")) {
      setDetectedOS("linux");
    }
  }, []);

  const activePlatform = platform === "auto" ? detectedOS : platform;
  const showWindows =
    activePlatform === "windows" ||
    activePlatform === "all" ||
    (platform === "auto" && detectedOS === "unknown");
  const showLinux =
    activePlatform === "linux" ||
    activePlatform === "all" ||
    (platform === "auto" && detectedOS === "unknown");

  return (
    <section className="w-full max-w-7xl mx-auto py-20 md:py-32 border-t border-foreground/5 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Install ArchCalc
        </h2>
        <p className="text-muted max-w-2xl mb-8">
          Available for your favorite Linux distributions and Windows.
        </p>

        {/* Dropdown for OS selection */}
        <div className="relative inline-block text-left mb-8">
          <div className="flex items-center gap-2 text-sm text-muted mb-2">
            <span className="font-medium">Platform:</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="bg-background/60 border border-foreground/10 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            >
              <option value="auto">
                Auto-detect (
                {detectedOS === "unknown"
                  ? "All"
                  : detectedOS === "windows"
                    ? "Windows"
                    : "Linux"}
                )
              </option>
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
              <option value="all">All Platforms</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto w-full">
        {/* Direct Download Card (Linux) */}
        {showLinux && (
          <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all">
            <div className="h-16 w-16 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-muted mb-6 group-hover:scale-110 transition-transform">
              <Download className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">
              Direct Download
            </h3>
            <p className="text-muted mb-6 flex-1">
              Download pre-compiled binaries from GitHub.
            </p>
            <div className="flex flex-col gap-2 w-full">
              <Link
                href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc_${latestVersion.replace("v", "")}_amd64.deb`}
                className="bg-foreground/10 hover:bg-foreground/20 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-foreground/5"
              >
                Download .deb
              </Link>
              <Link
                href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc-${latestVersion.replace("v", "")}-1.x86_64.rpm`}
                className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-foreground/5"
              >
                Download .rpm
              </Link>
            </div>
          </div>
        )}

        {/* AUR Card (Linux) */}
        {showLinux && (
          <Link
            href="https://aur.archlinux.org/packages/archcalc"
            target="_blank"
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all"
          >
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">
              Arch User Repository
            </h3>
            <p className="text-muted mb-6 flex-1">
              Install via your favorite AUR helper.
            </p>
            <code className="bg-foreground/5 px-4 py-2 rounded-lg w-full text-blue-600 dark:text-blue-300 font-mono text-sm border border-foreground/5 group-hover:border-blue-500/30 transition-colors">
              yay -S archcalc
            </code>
          </Link>
        )}

        {/* Windows Card */}
        {showWindows && (
          <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all">
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Monitor className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Windows</h3>
            <p className="text-muted mb-6 flex-1">
              Download the official Windows installer.
            </p>
            <div className="flex flex-col gap-2 w-full mb-4">
              <Link
                href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc_${latestVersion.replace("v", "")}_x64_en-US.msi`}
                className="bg-foreground/10 hover:bg-foreground/20 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-foreground/5"
              >
                Download .msi
              </Link>
              <Link
                href={`https://github.com/murtazapatel89100/ArchCalc/releases/download/${latestVersion}/archcalc_${latestVersion.replace("v", "")}_x64-setup.exe`}
                className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-foreground/5"
              >
                Download .exe
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-4 mt-auto"
            >
              Windows Notice (Unknown Publisher)
            </button>
          </div>
        )}

        {/* Flatpak Card (Linux) */}
        {showLinux && (
          <div className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-1 transition-all opacity-80 cursor-not-allowed">
            <div className="h-16 w-16 rounded-2xl bg-foreground/5 flex items-center justify-center text-muted mb-6 group-hover:scale-110 transition-transform">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Flatpak</h3>
            <p className="text-muted mb-6 flex-1">Coming soon to Flathub.</p>
            <code className="bg-foreground/5 px-4 py-2 rounded-lg w-full text-muted/80 font-mono text-sm border border-foreground/5">
              flatpak install archcalc
            </code>
          </div>
        )}
      </div>

      {/* Windows Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-foreground/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-foreground/10">
              <h3 className="text-xl font-bold text-foreground">
                Windows Notice
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-foreground/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-foreground/80 text-sm leading-relaxed">
              <p>
                ArchCalc is an open-source application distributed through
                official GitHub Releases.
              </p>
              <p>
                Because ArchCalc is currently not code-signed, Windows
                SmartScreen may display an &quot;Unknown Publisher&quot; warning
                when launching the installer for the first time. This is common
                for new independent applications.
              </p>
              <p className="font-medium text-foreground">To proceed:</p>
              <ol className="list-decimal pl-5 space-y-2 marker:text-muted/80">
                <li>
                  Verify that you downloaded ArchCalc from the official GitHub
                  release or{" "}
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">
                    archcalc.murtazapatel.dev
                  </span>
                  .
                </li>
                <li>
                  Click <strong className="text-foreground">More info</strong>.
                </li>
                <li>
                  Click <strong className="text-foreground">Run anyway</strong>.
                </li>
              </ol>
              <p className="pt-2 border-t border-foreground/5">
                ArchCalc does not require disabling Windows Defender or your
                antivirus software.
              </p>
            </div>
            <div className="p-4 bg-foreground/5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
