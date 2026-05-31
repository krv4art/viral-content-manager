import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const allowed =
      host.endsWith(".tiktokcdn.com") ||
      host.endsWith(".tiktokcdn-us.com") ||
      host.endsWith(".cdninstagram.com") ||
      host.endsWith(".fbcdn.net");
    if (!allowed) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    const isInstagram = host.endsWith(".cdninstagram.com") || host.endsWith(".fbcdn.net");
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": isInstagram ? "https://www.instagram.com/" : "https://www.tiktok.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "sec-fetch-dest": "image",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "cross-site",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") ?? "image/webp";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
