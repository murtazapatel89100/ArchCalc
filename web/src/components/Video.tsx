"use client";

import { useEffect, useRef } from "react";

type VideoProps = {
  /** Path to the MP4 under /public, e.g. "/videos/clip-calculator.mp4". */
  src: string;
  /** Optional WebM alternative (smaller for browsers that support VP9). */
  webm?: string;
  poster?: string;
  title: string;
  /** Width / height of the recording, used to reserve space and avoid layout shift. */
  aspectRatio?: string;
  className?: string;
};

/**
 * Muted, looping product video that only plays while it is on screen, so a page with several
 * clips doesn't decode them all at once.
 */
export function Video({
  src,
  webm,
  poster,
  title,
  aspectRatio = "16 / 10",
  className,
}: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay can be blocked (e.g. data saver); the controls still work.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      className={`not-prose my-6 overflow-hidden rounded-xl border border-foreground/10 bg-black shadow-xl ${className ?? ""}`}
    >
      <video
        ref={ref}
        title={title}
        aria-label={title}
        poster={poster}
        muted
        loop
        playsInline
        controls
        preload="metadata"
        className="block h-auto w-full"
        style={{ aspectRatio }}
      >
        {webm && <source src={webm} type="video/webm" />}
        <source src={src} type="video/mp4" />
        Your browser does not support embedded videos.{" "}
        <a href={src}>Download the video</a>.
      </video>
    </figure>
  );
}
