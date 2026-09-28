import type { GuideMediaKind } from "@/lib/guide-media";

export function GuideMedia({
  url,
  type,
  title,
}: {
  url: string | null;
  type: string | null;
  title: string;
}) {
  if (!url || (type !== "image" && type !== "video")) {
    return null;
  }

  const kind = type as GuideMediaKind;

  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="mt-3 w-full rounded-lg bg-black"
      >
        {title}
      </video>
    );
  }

  return (
    <img src={url} alt={title} className="mt-3 w-full rounded-lg object-cover" />
  );
}
