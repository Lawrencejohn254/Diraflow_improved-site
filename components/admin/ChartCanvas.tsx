'use client';
import { useEffect, useRef } from 'react';
import { Chart, registerables, type ChartData, type ChartOptions, type ChartType } from 'chart.js';

Chart.register(...registerables);

const FONT = "'Plus Jakarta Sans','Sora',sans-serif";
const css = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** A chart that follows the page theme (grid and label colours) and cleans up after itself. */
export default function ChartCanvas({ type, data, options }: { type: ChartType; data: ChartData; options?: ChartOptions }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([type, data, options]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let chart: Chart | null = null;
    const build = () => {
      chart?.destroy();
      const grid = css('--border', '#E5E7EB'), text = css('--fg2', '#6B7280');
      const pie = type === 'pie' || type === 'doughnut';
      const base: ChartOptions = {
        responsive: true, maintainAspectRatio: false, color: text, font: { family: FONT, size: 11 },
        plugins: { legend: { display: pie, position: 'bottom', labels: { boxWidth: 12, color: text, font: { family: FONT, size: 11 } } } },
        scales: pie ? {} : {
          x: { beginAtZero: true, grid: { display: false }, ticks: { color: text, font: { family: FONT, size: 11 } } },
          y: { grid: { color: grid }, ticks: { color: text, font: { family: FONT, size: 11 } } },
        },
      };
      const o = options || {};
      const merged = { ...base, ...o, plugins: { ...base.plugins, ...(o.plugins || {}) }, scales: pie ? {} : mergeScales(base.scales, o.scales, grid, text) } as ChartOptions;
      chart = new Chart(canvas, { type, data: JSON.parse(JSON.stringify(data)), options: merged });
    };
    build();
    // Rebuild when the theme is switched so the grid and labels stay readable.
    const obs = new MutationObserver(build);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { obs.disconnect(); chart?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures type, data and options by value
  }, [key]);

  return <canvas ref={ref} />;
}

function mergeScales(base: ChartOptions['scales'], extra: ChartOptions['scales'], grid: string, text: string): ChartOptions['scales'] {
  const out: Record<string, object> = {};
  for (const k of new Set([...Object.keys(base || {}), ...Object.keys(extra || {})])) {
    const b = (base as Record<string, object>)?.[k] || {}, e = (extra as Record<string, { grid?: object; ticks?: object }>)?.[k] || {};
    out[k] = { ...b, ...e, grid: { ...(b as { grid?: object }).grid, ...(e.grid || {}), ...(e.grid && 'display' in e.grid ? {} : { color: grid }) }, ticks: { ...(b as { ticks?: object }).ticks, ...(e.ticks || {}), color: text } };
  }
  return out as ChartOptions['scales'];
}
