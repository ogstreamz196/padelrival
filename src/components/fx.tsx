import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** True when the player has asked their device for less motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

const COLORS = ["#d7ff3e", "#3b8cff", "#ff8a3d", "#3ddc84", "#ffffff", "#ff4d5e"];

/** One-shot confetti burst on a full-screen canvas. Plays once per mount, ~2.5 s. */
export function Confetti({ delay = 250, count = 140 }: { delay?: number; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const parts = Array.from({ length: count }, (_, i) => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 7 + Math.random() * 9;
      return {
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H * 0.35,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 10,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        c: COLORS[i % COLORS.length]!,
      };
    });
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const fade = Math.max(0, 1 - Math.max(0, t - 1600) / 900);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.r * 2));
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < 2500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [delay, count]);
  return (
    <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />
  );
}

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Server HTML and first paint are fully visible; only sections still below the fold get
  // hidden after hydration, so crawlers and no-JS visitors always see the content.
  const [phase, setPhase] = useState<"static" | "waiting" | "in">("static");
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setPhase("waiting");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setPhase("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn(phase !== "static" && "fx-reveal", phase === "in" && "fx-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** 3D tilt with a moving glare that follows the mouse (mouse and trackpad only). */
export function Tilt({
  children,
  className,
  max = 10,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${-y * max}deg`);
      el.style.setProperty("--ry", `${x * max}deg`);
      el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
      el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
    };
    const leave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);
  return (
    <div ref={ref} className={cn("fx-tilt", className)}>
      {children}
      <span className="fx-glare" aria-hidden />
    </div>
  );
}

/** Counts up to `value` once it scrolls into view; non-numeric strings render as-is. */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const m = value.match(/^([+-]?)(\d+)(.*)$/);
  const target = m ? Number(m[2]) : 0;
  const [n, setN] = useState(m ? 0 : target);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!m) return;
    if (prefersReducedMotion()) {
      setN(target);
      return;
    }
    const el = ref.current;
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        run();
        io.disconnect();
      }
    });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <span>{value}</span>;
  return (
    <span ref={ref} className="tabular-nums">
      {m[1]}
      {n}
      {m[3]}
    </span>
  );
}

/** Decorative padel court that draws itself, with a glowing ball bouncing across it. */
export function CourtFx({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("fx-court pointer-events-none", className)}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none">
        <rect x="1" y="1" width="198" height="98" rx="2" pathLength={1} />
        <path d="M100 1 V99" pathLength={1} className="fx-net" />
        <path d="M30 1 V99" pathLength={1} />
        <path d="M170 1 V99" pathLength={1} />
        <path d="M30 50 H170" pathLength={1} />
      </svg>
      <span className="fx-ball" />
      <span className="fx-ball-shadow" />
    </div>
  );
}

/** Soft light that follows the mouse across its parent (desktop only). */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ref.current!.style.setProperty("--sx", `${e.clientX - r.left}px`);
      ref.current!.style.setProperty("--sy", `${e.clientY - r.top}px`);
      ref.current!.style.opacity = "1";
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="fx-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700"
    />
  );
}
