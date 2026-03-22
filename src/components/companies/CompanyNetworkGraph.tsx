import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Company } from '@/types/company';
import { getCompanyColor } from '@/components/shared/CompanyLogo';

interface Props {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
  lang?: 'es' | 'en';
}

interface Node {
  id: string;
  company: Company;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  targetX: number;
  targetY: number;
}

const MIN_RADIUS = 24;
const MAX_RADIUS = 72;
const PADDING = 8;

function computeRadius(memberCount: number, maxCount: number): number {
  if (maxCount === 0) return MIN_RADIUS;
  const t = Math.sqrt(memberCount / Math.max(maxCount, 1));
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export const CompanyNetworkGraph: React.FC<Props> = ({
  companies,
  onCompanyClick,
  lang = 'es',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const hoveredRef = useRef<string | null>(null);
  const [hovered, setHovered] = useState<Company | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize nodes when companies change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const maxCount = Math.max(...companies.map((c) => c.memberCount), 1);

    // Group by industry for clustering
    const industryMap = new Map<string, Company[]>();
    companies.forEach((c) => {
      const key = c.industry || 'Other';
      if (!industryMap.has(key)) industryMap.set(key, []);
      industryMap.get(key)!.push(c);
    });

    const industryKeys = Array.from(industryMap.keys());
    const angleStep = (2 * Math.PI) / Math.max(industryKeys.length, 1);
    const clusterRadius = Math.min(w, h) * 0.3;

    const nodes: Node[] = [];
    industryKeys.forEach((industry, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const cx = w / 2 + Math.cos(angle) * clusterRadius;
      const cy = h / 2 + Math.sin(angle) * clusterRadius;
      const group = industryMap.get(industry)!;

      group.forEach((company, j) => {
        const spread = Math.min(group.length * 8, clusterRadius * 0.6);
        const subAngle = (2 * Math.PI * j) / Math.max(group.length, 1);
        nodes.push({
          id: company.id,
          company,
          x: w / 2 + (Math.random() - 0.5) * w * 0.6,
          y: h / 2 + (Math.random() - 0.5) * h * 0.6,
          vx: 0,
          vy: 0,
          radius: computeRadius(company.memberCount, maxCount),
          color: getCompanyColor(company.name),
          targetX: cx + Math.cos(subAngle) * spread,
          targetY: cy + Math.sin(subAngle) * spread,
        });
      });
    });

    nodesRef.current = nodes;
  }, [companies]);

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = Math.max(500, rect.height) * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${Math.max(500, rect.height)}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Physics simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    function tick() {
      if (!running || !ctx || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const nodes = nodesRef.current;

      // Physics: attract to target + repel from each other
      for (const node of nodes) {
        // Attract to cluster target
        const dx = node.targetX - node.x;
        const dy = node.targetY - node.y;
        node.vx += dx * 0.005;
        node.vy += dy * 0.005;

        // Center gravity
        node.vx += (w / 2 - node.x) * 0.0003;
        node.vy += (h / 2 - node.y) * 0.0003;
      }

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + PADDING;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.15;
            const fx = dx * force;
            const fy = dy * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Update positions
      for (const node of nodes) {
        node.vx *= 0.85; // damping
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        // Constrain to canvas
        node.x = Math.max(node.radius, Math.min(w - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(h - node.radius, node.y));
      }

      // Render
      ctx.clearRect(0, 0, w, h);

      // Draw industry labels (behind bubbles)
      const industryPositions = new Map<string, { x: number; y: number; count: number }>();
      for (const node of nodes) {
        const key = node.company.industry || 'Other';
        const pos = industryPositions.get(key) || { x: 0, y: 0, count: 0 };
        pos.x += node.x;
        pos.y += node.y;
        pos.count += 1;
        industryPositions.set(key, pos);
      }
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const [label, pos] of industryPositions) {
        if (pos.count < 1) continue;
        const cx = pos.x / pos.count;
        const cy = pos.y / pos.count;
        ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
        ctx.fillText(label, cx, cy - MAX_RADIUS - 8);
      }

      // Draw bubbles
      for (const node of nodes) {
        const isHovered = hoveredRef.current === node.id;

        // Shadow
        ctx.shadowColor = isHovered ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = isHovered ? 16 : 8;
        ctx.shadowOffsetY = isHovered ? 4 : 2;

        // Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (isHovered ? 1.08 : 1), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = isHovered ? 1 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        if (isHovered) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Company initial or short name
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (node.radius > 36) {
          ctx.font = 'bold 13px system-ui, sans-serif';
          const name = node.company.name;
          const maxChars = Math.floor(node.radius / 5);
          const display = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
          ctx.fillText(display, node.x, node.y - 6);
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText(`${node.company.memberCount}`, node.x, node.y + 10);
        } else if (node.radius > 28) {
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(node.company.name.charAt(0), node.x, node.y);
        } else {
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText(node.company.name.charAt(0), node.x, node.y);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [companies]);

  // Mouse interaction
  const findNode = useCallback(
    (clientX: number, clientY: number): Node | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      // Check in reverse order (top-most first)
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const node = nodesRef.current[i]!;
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy <= node.radius * node.radius) return node;
      }
      return null;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const node = findNode(e.clientX, e.clientY);
      hoveredRef.current = node?.id || null;
      setHovered(node?.company || null);
      if (node) {
        const rect = containerRef.current?.getBoundingClientRect();
        setTooltipPos({
          x: e.clientX - (rect?.left || 0),
          y: e.clientY - (rect?.top || 0),
        });
      }
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = node ? 'pointer' : 'default';
    },
    [findNode]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const node = findNode(e.clientX, e.clientY);
      if (node) onCompanyClick(node.company);
    },
    [findNode, onCompanyClick]
  );

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHovered(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        style={{ minHeight: 500 }}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-600 dark:bg-gray-800"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 8,
            transform: tooltipPos.x > (containerRef.current?.clientWidth || 600) * 0.7 ? 'translateX(-120%)' : undefined,
          }}
        >
          <p className="font-medium text-gray-900 dark:text-white">{hovered.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {[hovered.industry, hovered.location].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
            {hovered.memberCount} {lang === 'es' ? 'miembros' : 'members'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{lang === 'es' ? 'Tamano = miembros' : 'Size = members'}</span>
        <span>{lang === 'es' ? 'Color = empresa' : 'Color = company'}</span>
        <span>{lang === 'es' ? 'Agrupados por industria' : 'Grouped by industry'}</span>
      </div>
    </div>
  );
};

export default CompanyNetworkGraph;
