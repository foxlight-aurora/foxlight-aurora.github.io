import { loadAuroraData } from "@/lib/load";

export const dynamic = "force-static";

/** Just the build's snapshot time: open pages poll this to tell when a newer build is live. */
export async function GET() {
  return Response.json({ generatedAt: loadAuroraData().generatedAt });
}
