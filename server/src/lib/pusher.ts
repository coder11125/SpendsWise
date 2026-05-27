import { config } from "../config.js";

let client: any = null;

async function getClient(): Promise<any> {
  if (!config.pusherAppId || !config.pusherKey || !config.pusherSecret) return null;
  if (!client) {
    try {
      const { default: Pusher } = await import("pusher");
      client = new Pusher({
        appId: config.pusherAppId,
        key: config.pusherKey,
        secret: config.pusherSecret,
        cluster: config.pusherCluster,
        useTLS: true,
      });
    } catch {
      return null;
    }
  }
  return client;
}

export async function notifyDataChanged(userId: string): Promise<void> {
  const p = await getClient();
  if (!p) return;
  try {
    await p.trigger(`user-${userId}`, "data-changed", {});
  } catch (err) {
    console.error("[PUSHER] Trigger failed:", err);
  }
}
