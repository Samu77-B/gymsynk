import { EmbedFrameShell } from "@/components/embed-frame-shell";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmbedFrameShell>{children}</EmbedFrameShell>;
}
