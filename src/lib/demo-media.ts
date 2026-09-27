import fs from "node:fs";
import path from "node:path";

/**
 * Drop demo assets in `public/demo/`. The page picks them up by filename.
 *
 * Walkthrough (first match wins):
 *   walkthrough.mp4 | walkthrough.webm | walkthrough.gif
 *
 * Dashboard screenshots (.png, .jpg, .jpeg, or .webp):
 *   dashboard, members, schedule, roster, door-entry, settings
 *
 * Existing-site screenshot:
 *   website
 */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "gif"];

export const demoShots = [
  {
    stem: "dashboard",
    title: "Dashboard",
    caption: "Today’s snapshot: members, check-ins, and what needs attention.",
  },
  {
    stem: "members",
    title: "Members",
    caption: "Records, plans, and who is active.",
  },
  {
    stem: "schedule",
    title: "Schedule",
    caption: "The class timetable staff build and members book from.",
  },
  {
    stem: "roster",
    title: "Staff roster",
    caption: "Who is working, and when.",
  },
  {
    stem: "door-entry",
    title: "Door entry",
    caption: "Reception scans a member’s gym pass. The result is granted or denied.",
  },
  {
    stem: "settings",
    title: "Settings",
    caption: "Features, logo, brand colour, and the website embed snippet.",
  },
] as const;

function findDemoFile(stem: string, extensions: string[]) {
  const dir = path.join(process.cwd(), "public", "demo");
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir);
  const wanted = new Set(
    extensions.map((extension) => `${stem}.${extension}`.toLowerCase()),
  );
  const match = files.find((file) => wanted.has(file.toLowerCase()));
  return match ? `/demo/${match}` : null;
}

export function loadDemoMedia() {
  const walkthrough = findDemoFile("walkthrough", VIDEO_EXTENSIONS);

  return {
    walkthrough,
    walkthroughIsVideo: Boolean(
      walkthrough && !walkthrough.toLowerCase().endsWith(".gif"),
    ),
    website: findDemoFile("website", IMAGE_EXTENSIONS),
    shots: demoShots.map((shot) => ({
      ...shot,
      src: findDemoFile(shot.stem, IMAGE_EXTENSIONS),
    })),
  };
}
