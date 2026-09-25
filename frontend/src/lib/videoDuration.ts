function parseVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

function parseYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

async function probeViaVimeoOEmbed(url: string): Promise<number | null> {
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { duration?: unknown };
    return typeof data.duration === "number" ? Math.round(data.duration) : null;
  } catch {
    return null;
  }
}

function probeViaVideoElement(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: number | null) => {
      if (settled) return;
      settled = true;
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      video.src = "";
      resolve(value);
    };
    const video = document.createElement("video");
    video.preload = "metadata";
    const onLoaded = () => {
      settle(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    };
    const onError = () => settle(null);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = url;
    // Some hosts never fire an error event for an unsupported link — give up after a while.
    window.setTimeout(() => settle(null), 6000);
  });
}

/**
 * Best-effort: reads the real duration of a video link. Works for direct file links
 * (mp4, webm...) and Vimeo (via its public oEmbed endpoint). YouTube's oEmbed does not
 * expose duration without an API key, so it resolves to null there — the caller must
 * not fall back to a manually typed value.
 */
export async function probeVideoDuration(url: string): Promise<number | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (parseVimeoUrl(trimmed)) {
    const viaOEmbed = await probeViaVimeoOEmbed(trimmed);
    if (viaOEmbed != null) return viaOEmbed;
    return null;
  }
  if (parseYouTubeUrl(trimmed)) return null;
  return probeViaVideoElement(trimmed);
}

export function formatVideoDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
