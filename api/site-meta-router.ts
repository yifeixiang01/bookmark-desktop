import { z } from "zod";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { createRouter, authedQuery } from "./middleware";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function clean(text: string | undefined | null, max: number): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** 解析 sizes 属性（如 "180x180"、"any"），返回用于排序的分数 */
function sizeScore(sizes: string | undefined, href: string, fallback: number): number {
  if (/\.svg(\?|$)/i.test(href)) return 999; // SVG 无限清晰
  if (!sizes) return fallback;
  if (sizes.trim().toLowerCase() === "any") {
    // "any" 用在 .ico 上只是占位声明，不代表高清
    return /\.ico(\?|$)/i.test(href) ? 16 : 512;
  }
  const m = /(\d+)\s*x\s*(\d+)/.exec(sizes);
  if (m) return Math.min(parseInt(m[1], 10), parseInt(m[2], 10));
  return fallback;
}

/** 从 HTML 挑选最清晰的图标：apple-touch-icon(180) > 大尺寸 PNG > SVG > favicon.ico */
function pickIcon($: cheerio.CheerioAPI, finalUrl: string): { icon: string; score: number } {
  type Cand = { url: string; score: number; order: number };
  const cands: Cand[] = [];
  let order = 0;
  const push = (href: string | undefined, score: number) => {
    if (!href) return;
    try {
      cands.push({ url: new URL(href, finalUrl).toString(), score, order: order++ });
    } catch {
      /* ignore */
    }
  };

  $('link[rel~="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    const href = $(el).attr("href");
    push(href, sizeScore($(el).attr("sizes"), href ?? "", 180));
  });
  // mask-icon 是单色 pinned-tab 图标，不参与候选
  $('link[rel="icon"], link[rel="shortcut icon"], link[rel="shortcut-icon"]').each((_, el) => {
    const href = $(el).attr("href");
    push(href, sizeScore($(el).attr("sizes"), href ?? "", 16));
  });

  if (!cands.length) return { icon: "", score: 0 };
  cands.sort((a, b) => b.score - a.score || a.order - b.order);
  return { icon: cands[0].url, score: cands[0].score };
}

/** 抓 manifest.json，挑最大的图标（PWA 站点常有 192/512 PNG） */
async function manifestIcon(manifestUrl: string, timeoutMs: number): Promise<{ icon: string; score: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(manifestUrl, { signal: controller.signal, headers: { "user-agent": UA } });
    const json = (await res.json()) as { icons?: { src?: string; sizes?: string; type?: string }[] };
    let best = { icon: "", score: 0 };
    for (const ic of json.icons ?? []) {
      if (!ic.src) continue;
      const score = ic.type?.includes("svg") || /\.svg(\?|$)/i.test(ic.src) ? 999 : sizeScore(ic.sizes, ic.src, 48);
      if (score > best.score) {
        try {
          best = { icon: new URL(ic.src, manifestUrl).toString(), score };
        } catch {
          /* ignore */
        }
      }
    }
    return best;
  } catch {
    return { icon: "", score: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** 从 HTML 解析站点标题 / 描述 / 图标 */
async function parseMeta(html: string, finalUrl: string) {
  const $ = cheerio.load(html);
  const pick = (...sels: string[]) => {
    for (const s of sels) {
      const v = $(s).first().attr("content") ?? $(s).first().text();
      if (v && v.trim()) return v;
    }
    return "";
  };

  const name = clean(
    pick('meta[property="og:site_name"]', 'meta[name="application-name"]') ||
      pick('meta[property="og:title"]', 'meta[name="twitter:title"]', "title"),
    60,
  );
  const description = clean(
    pick(
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ),
    200,
  );

  let { icon, score } = pickIcon($, finalUrl);
  // HTML 里没找到高清图标（<192）时，尝试 manifest.json 里的大图
  if (score < 128) {
    const manifestHref = $('link[rel="manifest"]').first().attr("href");
    if (manifestHref) {
      try {
        const m = await manifestIcon(new URL(manifestHref, finalUrl).toString(), 3000);
        if (m.score > score) icon = m.icon;
      } catch {
        /* ignore */
      }
    }
  }
  if (!icon) {
    try {
      icon = new URL("/favicon.ico", finalUrl).toString();
    } catch {
      /* ignore */
    }
  }
  return { name, description, icon };
}

export const siteMetaRouter = createRouter({
  /** 抓取目标网站的标题、描述与图标（服务端代理，避免跨域限制） */
  fetchInfo: authedQuery
    .input(z.object({ url: z.string().trim().max(2048) }))
    .query(async ({ input }) => {
      let target: URL;
      try {
        const u = input.url.startsWith("http") ? input.url : `https://${input.url}`;
        target = new URL(u);
        if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error();
      } catch {
        return { ok: false as const, name: "", description: "", icon: "" };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(target, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "user-agent": UA,
            accept: "text/html,application/xhtml+xml,*/*;q=0.8",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          },
        });
        const buf = Buffer.from(await res.arrayBuffer());
        // 元数据都在 <head> 里：先定位 </head>，只解码到那里（防超大页面；个别站点 head 很大）
        const probe = buf.subarray(0, 4 * 1024 * 1024).toString("latin1");
        const headEnd = probe.toLowerCase().indexOf("</head>");
        const sliced =
          headEnd > 0
            ? buf.subarray(0, Buffer.byteLength(probe.slice(0, headEnd + 7), "latin1"))
            : buf.subarray(0, 512 * 1024);

        // 编码嗅探：content-type 头 > meta charset，默认 utf-8；支持 gbk 等中文站
        const ct = res.headers.get("content-type") ?? "";
        let charset = /charset=([\w-]+)/i.exec(ct)?.[1]?.toLowerCase() ?? "";
        if (!charset) {
          const head = sliced.subarray(0, 8192).toString("latin1");
          charset =
            /charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase() ?? "utf-8";
        }
        const html = iconv.encodingExists(charset)
          ? iconv.decode(sliced, charset)
          : sliced.toString("utf-8");

        const meta = await parseMeta(html, res.url || target.toString());
        return { ok: true as const, ...meta };
      } catch {
        return { ok: false as const, name: "", description: "", icon: "" };
      } finally {
        clearTimeout(timer);
      }
    }),
});
