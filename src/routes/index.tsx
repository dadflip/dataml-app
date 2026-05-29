import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Workflow } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">

      {/* ── Tech grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59,63,245,0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59,63,245,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />

      {/* ── Glow centre ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(59,63,245,0.12) 0%, transparent 100%)",
        }}
      />

      {/* ── Top-left large blob ── */}
      <div
        className="pointer-events-none absolute -left-64 -top-64 h-[700px] w-[700px] rounded-full blur-[120px] opacity-25"
        style={{ background: "radial-gradient(circle, #3b3ff5 0%, transparent 70%)" }}
      />
      {/* ── Bottom-right blob ── */}
      <div
        className="pointer-events-none absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full blur-[100px] opacity-15"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      {/* ── Scanline overlay for depth ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* Logo */}
        <div className="mb-10">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
              boxShadow: "0 0 40px rgba(59,63,245,0.4), 0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <Workflow size={30} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1
          className="mb-3 text-6xl sm:text-8xl md:text-[8rem] font-bold leading-[0.95] tracking-tight text-foreground"
          style={{ textShadow: "0 0 80px rgba(59,63,245,0.25)" }}
        >
          DataML
        </h1>
        <p className="mb-8 sm:mb-12 max-w-md text-lg sm:text-2xl font-light text-muted-foreground">
          Composez, entraînez,{" "}
          <span className="text-foreground/70">exportez.</span>
        </p>

        {/* CTA */}
        <Link
          to="/app"
          className="group inline-flex items-center gap-3 rounded-full px-10 py-4 text-base font-semibold text-white transition-all duration-200 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
            boxShadow: "0 0 30px rgba(59,63,245,0.35), 0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          Démarrer{" "}
          <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>

        {/* Hint */}
        <p className="mt-5 text-xs text-muted-foreground/60">
          Gratuit · Open source · Aucune installation requise
        </p>
      </div>

      {/* ── Bottom pipeline bar ── */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-wrap justify-center items-center gap-x-3 gap-y-2 px-4 text-[9px] sm:text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/40">
        {["Datasets", "EDA", "Modèles", "Évaluation", "Export"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-3">
            {s}
            {i < arr.length - 1 && (
              <span className="hidden sm:block h-px w-4 bg-muted-foreground/20" />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
