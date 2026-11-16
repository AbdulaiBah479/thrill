"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap } from "leaflet";
import { type Ev, minPrice, pinFor } from "@/lib/events";

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const safeColor = (c: string) => (/^#[0-9a-fA-F]{3,8}$/.test(c) ? c : "#ff2e88");

/** Map of events. Tiles come from OpenStreetMap, so they need signal; the pins and list still work without it. */
export function MapView({ events, onOpen }: { events: Ev[]; onOpen: (e: Ev) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  });

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current) return;
      map.current?.stop();
      map.current?.remove();
      const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([8.4657, -13.2317], 12);
      map.current = m;
      L.control.zoom({ position: "topright" }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(m);

      const pts: [number, number][] = [];
      events.forEach((e) => {
        const p = pinFor(e);
        pts.push(p);
        const free = minPrice(e) === 0;
        const icon = L.divIcon({
          className: "",
          iconSize: [46, 46],
          iconAnchor: [23, 46],
          html: `<button aria-label="Open ${esc(e.title)}" data-ev="${esc(e.id)}" style="all:unset;cursor:pointer;display:grid;place-items:center;width:46px;height:46px">
            <span style="display:grid;place-items:center;width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,${safeColor(e.colors[0])},${safeColor(e.colors[1])});border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.5)">
              <b style="transform:rotate(45deg);color:#fff;font:800 11px system-ui">${free ? "FREE" : esc(String(minPrice(e)))}</b>
            </span></button>`,
        });
        L.marker(p, { icon, title: e.title.slice(0, 120) }).addTo(m).on("click", () => open.current(e));
      });
      if (pts.length > 1) m.fitBounds(pts, { padding: [50, 50], maxZoom: 14, animate: false });
      else if (pts.length === 1) m.setView(pts[0], 14, { animate: false });
    })();
    return () => {
      dead = true;
      map.current?.stop(); // cancel pending animations so removing the map cannot throw
      map.current?.remove();
      map.current = null;
    };
  }, [events]);

  return <div ref={box} className="absolute inset-0 z-0 isolate bg-[#15101d]" role="region" aria-label="Map of events" />;
}
