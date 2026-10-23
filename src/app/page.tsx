import { App } from "@/components/App";
import { getChannels } from "@/lib/data";

export const dynamic = "force-dynamic"; // per-request; upstream fetches are cached 90 s

export default async function Home() {
  const { channels, error } = await getChannels();
  return <App initial={channels} initialError={error} />;
}
