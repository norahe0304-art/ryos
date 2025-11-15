export const runtime = "nodejs";

export default async function handler(req: Request): Promise<Response> {
  const pusherBeamsKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherKey = process.env.PUSHER_KEY;
  
  return new Response(
    JSON.stringify({
      PUSHER_BEAMS_SECRET_KEY: pusherBeamsKey ? `已设置 (长度: ${pusherBeamsKey.length})` : "未设置",
      PUSHER_APP_ID: pusherAppId ? "已设置" : "未设置",
      PUSHER_KEY: pusherKey ? "已设置" : "未设置",
      allPusherVars: Object.keys(process.env).filter(k => k.includes('PUSHER')),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

