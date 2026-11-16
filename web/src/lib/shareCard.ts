import type { Ev } from "./events";
import { minPrice } from "./events";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws a 1080x1920 "story" image of the event, ready for WhatsApp Status or Instagram. */
export async function makeShareCard(e: Ev): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#0b0712";
  ctx.fillRect(0, 0, W, H);

  const photo = e.photo ? await loadImage(e.photo) : null;
  if (photo) {
    const s = Math.max(W / photo.width, H / photo.height);
    ctx.drawImage(photo, (W - photo.width * s) / 2, (H - photo.height * s) / 2, photo.width * s, photo.height * s);
  }
  // colour wash, same look as the app
  const g1 = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, W * 0.9);
  g1.addColorStop(0, e.colors[0] + (photo ? "aa" : "ff"));
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createLinearGradient(0, H * 0.35, 0, H);
  g2.addColorStop(0, "rgba(11,7,18,0)");
  g2.addColorStop(0.65, "rgba(11,7,18,.92)");
  g2.addColorStop(1, "#0b0712");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // brand
  ctx.fillStyle = "#fff";
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("T H R I L L", 70, 130);
  [["#1eb53a", 0], ["#ffffff", 1], ["#0072c6", 2]].forEach(([col, i]) => {
    ctx.fillStyle = col as string;
    ctx.fillRect(70 + (i as number) * 56, 156, 56, 8);
  });

  // text block
  ctx.fillStyle = "#fff";
  ctx.font = "800 118px system-ui, sans-serif";
  const lines = wrap(ctx, e.title, W - 140).slice(0, 4);
  let y = 1130 - (lines.length - 1) * 128;
  lines.forEach((l) => {
    ctx.fillText(l, 70, y);
    y += 128;
  });

  ctx.font = "700 52px system-ui, sans-serif";
  ctx.fillStyle = "#ffc83d";
  ctx.fillText(e.when, 70, y + 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 50px system-ui, sans-serif";
  ctx.fillText(e.area, 70, y + 90);
  const price = minPrice(e);
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(price === 0 ? "Free entry" : `Tickets from NLe ${price}`, 70, y + 160);

  // call to action
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(70, H - 330, W - 140, 130, 40);
  else ctx.rect(70, H - 330, W - 140, 130);
  ctx.fill();
  ctx.fillStyle = "#0b0712";
  ctx.font = "800 54px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Get your pass on THRILL", W / 2, H - 247);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font = "500 36px system-ui, sans-serif";
  ctx.fillText(`Pass code prefix ${e.id} · Verified organizers only`, 70, H - 130);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** Shares the card through the phone's share sheet, or downloads it. Returns what happened. */
export async function shareCard(e: Ev): Promise<"shared" | "downloaded"> {
  const blob = await makeShareCard(e);
  const file = new File([blob], `thrill-${e.id}.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: e.title, text: `${e.title} · ${e.when} · ${e.area}` });
      return "shared";
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
