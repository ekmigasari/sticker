import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowsHorizontal,
  ArrowsVertical,
  CaretLeft,
  CheckCircle,
  CreditCard,
  FolderSimple,
  GridFour,
  LinkSimple,
  LockSimple,
  LockSimpleOpen,
  Minus,
  Plus,
  PushPin,
  Sticker as StickerIcon,
  Tag,
  TextAlignLeft,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  CATEGORIES,
  PLOT_MAX,
  PLOT_MIN,
  type Category,
  fieldWarning,
  formatPlot,
  plotPrice,
  plotSideBounds,
  unitsToPx,
  validatePlot,
} from "@/domain/types";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { publishPlaceListing } from "@/lib/place-publish";
import { isValidStickerUrl, normalizeStickerUrl } from "@/lib/sticker-meta";
import { useWallStore } from "@/store/wall-store";
import { StickerWall } from "@/components/wall/sticker-wall";

type Step = "details" | "pay" | "place" | "done";

/** Matches backend short-description cap in sticker-api. */
const MAX_DESCRIPTION_CHARS = 160;

/** Apple-surface styling on top of underline-default UI primitives. */
const fieldSurface =
  "h-12 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 text-[15px] tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0";

const textareaSurface =
  "min-h-24 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 py-3 text-[15px] tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0";

function stripUrlProtocol(raw: string) {
  return raw.replace(/^https?:\/\//i, "");
}

function PlaceShell({
  title,
  backTo,
  onBack,
  backLabel,
  trailing,
  children,
}: {
  title: string;
  backTo?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="font-ui relative flex h-[100dvh] flex-col overflow-hidden bg-white text-neutral-900 antialiased">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)] sm:px-5">
        {onBack ? (
          <button
            type="button"
            aria-label={backLabel ?? "Back"}
            onClick={onBack}
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </button>
        ) : backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel ?? "Back"}
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        <div className="flex min-w-10 items-center justify-end gap-2">
          {trailing}
        </div>
      </header>
      {children}
    </div>
  );
}

function parseDim(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function clampSide(n: number, other: number | null) {
  const { min, max } = plotSideBounds(other);
  return Math.min(max, Math.max(min, n));
}

function plotBoxSize(w: number, h: number, stage: number) {
  const maxDim = Math.max(w, h);
  const t = Math.min(1, Math.max(0, (maxDim - PLOT_MIN) / (16 - PLOT_MIN)));
  const fill = 0.7 + 0.26 * t;
  const aspect = w / h;
  if (aspect >= 1) {
    const width = stage * fill;
    return { width, height: width / aspect };
  }
  const height = stage * fill;
  return { width: height * aspect, height };
}

function plotGridStyle(w: number, h: number): CSSProperties {
  return {
    backgroundImage: [
      "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)",
      "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
    ].join(","),
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: "0 0",
  };
}

function FieldLabel({
  htmlFor,
  icon,
  children,
  hint,
}: {
  htmlFor?: string;
  icon: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="nk-label flex items-center gap-1.5 text-neutral-600"
      >
        <span className="grid size-5 place-items-center text-neutral-400">
          {icon}
        </span>
        {children}
      </label>
      {hint ? (
        <span className="text-[12px] text-neutral-400">{hint}</span>
      ) : null}
    </div>
  );
}

function IconWell({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "accent";
}) {
  return (
    <div
      className={cn(
        "grid size-16 place-items-center rounded-full",
        tone === "success" && "bg-emerald-50 text-emerald-600",
        tone === "accent" && "bg-neutral-900 text-white",
        tone === "neutral" && "bg-black/[0.045] text-neutral-800",
      )}
    >
      {children}
    </div>
  );
}

function PlotPreview({
  src,
  w,
  h,
  valid,
  compact,
}: {
  src: string;
  w: number | null;
  h: number | null;
  valid: boolean;
  compact?: boolean;
}) {
  const stage = compact ? 180 : 300;
  const unitsW = w ?? 5;
  const unitsH = h ?? 5;
  const box = plotBoxSize(unitsW, unitsH, stage);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        compact ? "py-4" : "py-8",
      )}
    >
      {/* Fixed stage so plot size changes never shift layout below */}
      <div
        className="relative shrink-0"
        style={{ width: stage + 32, height: stage + 40 }}
      >
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden",
            !valid && "opacity-45",
          )}
          style={{
            width: box.width,
            height: box.height,
          }}
        >
          <img
            src={src}
            alt="Your sticker"
            className="relative z-10 size-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20"
            style={plotGridStyle(unitsW, unitsH)}
          />
        </div>

        {valid ? (
          <>
            <span className="pointer-events-none absolute top-1/2 left-0 flex -translate-y-1/2 flex-col items-center gap-0.5 text-neutral-400">
              <ArrowsVertical weight="bold" className="size-2.5" />
              <span className="text-[10px] font-medium tabular-nums">
                {unitsH}
              </span>
            </span>
            <span className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-0.5 text-neutral-400">
              <ArrowsHorizontal weight="bold" className="size-2.5" />
              <span className="text-[10px] font-medium tabular-nums">
                {unitsW}
              </span>
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] font-medium tracking-[-0.01em] text-neutral-400">
        {valid
          ? `${formatPlot(unitsW, unitsH)} · ${unitsW * unitsH} units`
          : "Enter a valid plot size"}
      </p>
    </div>
  );
}

/** Quick picks under the size inputs (Custom is separate). */
const PICKER_PRESETS = [
  { id: "3x3", label: "3×3", w: 3, h: 3 },
  { id: "6x4", label: "6×4", w: 6, h: 4 },
  { id: "12x9", label: "12×9", w: 12, h: 9 },
  { id: "10x10", label: "10×10", w: 10, h: 10 },
  { id: "16x9", label: "16×9", w: 16, h: 9 },
  { id: "9x16", label: "9×16", w: 9, h: 16 },
] as const;

function LimitLine() {
  return (
    <p className="text-center text-[11px] text-neutral-400">
      Min {PLOT_MIN} · Max {PLOT_MAX} · Max ratio 16:9
    </p>
  );
}

function DimStepper({
  id,
  value,
  min,
  max,
  invalid,
  onChange,
  onStep,
  onFocus,
  onBlur,
}: {
  id: string;
  value: string;
  min: number;
  max: number;
  invalid?: boolean;
  onChange: (raw: string) => void;
  onStep: (delta: number) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const n = parseDim(value);
  const atMin = n != null && n <= min;
  const atMax = n != null && n >= max;

  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Decrease"
        disabled={atMin}
        onClick={() => onStep(-1)}
        className="press grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-700 transition-colors hover:bg-black/[0.09] active:scale-[0.96] disabled:opacity-30 disabled:hover:bg-black/[0.06]"
      >
        <Minus weight="bold" className="size-3.5" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-invalid={invalid}
        className={cn(
          "h-11 w-28 shrink-0 rounded-[12px] border border-black/[0.06] bg-[#f5f5f7] text-center text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-neutral-900 outline-none transition-colors focus:border-black/15 focus:bg-white",
          invalid && "border-red-300 bg-red-50 focus:border-red-400",
        )}
        placeholder="5"
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={atMax}
        onClick={() => onStep(1)}
        className="press grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-700 transition-colors hover:bg-black/[0.09] active:scale-[0.96] disabled:opacity-30 disabled:hover:bg-black/[0.06]"
      >
        <Plus weight="bold" className="size-3.5" />
      </button>
    </div>
  );
}

export function PlaceFlow() {
  const navigate = useNavigate();
  const draftSticker = useWallStore((s) => s.draftSticker);
  const placeDraft = useWallStore((s) => s.placeDraft);
  const setDraftSticker = useWallStore((s) => s.setDraftSticker);
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft);
  const confirmPlacement = useWallStore((s) => s.confirmPlacement);
  const hydrate = useWallStore((s) => s.hydrate);

  const [step, setStep] = useState<Step>("details");
  const [widthRaw, setWidthRaw] = useState("5");
  const [heightRaw, setHeightRaw] = useState("5");
  const [ratioLocked, setRatioLocked] = useState(false);
  const lockedAspectRef = useRef(1);
  const [activeDim, setActiveDim] = useState<"w" | "h" | null>(null);
  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("Developer Tools");
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const unitsW = parseDim(widthRaw);
  const unitsH = parseDim(heightRaw);
  const plotCheck =
    unitsW != null && unitsH != null
      ? validatePlot(unitsW, unitsH)
      : { ok: false as const, reason: "Enter width and height." };
  const price =
    plotCheck.ok && unitsW != null && unitsH != null
      ? plotPrice(unitsW, unitsH)
      : null;

  const widthWarn = fieldWarning(unitsW, unitsH, "width");
  const heightWarn = fieldWarning(unitsH, unitsW, "height");

  const activePresetId = useMemo(() => {
    if (unitsW == null || unitsH == null) return null;
    return (
      PICKER_PRESETS.find((p) => p.w === unitsW && p.h === unitsH)?.id ?? null
    );
  }, [unitsW, unitsH]);
  const isCustom = unitsW != null && unitsH != null && activePresetId == null;

  const canContinue = useMemo(() => {
    const chars = oneLiner.trim().length;
    return (
      plotCheck.ok &&
      name.trim().length > 1 &&
      chars > 3 &&
      chars <= MAX_DESCRIPTION_CHARS &&
      isValidStickerUrl(url)
    );
  }, [plotCheck.ok, name, oneLiner, url]);

  function syncLockedAspect(w: number, h: number) {
    if (h > 0) lockedAspectRef.current = w / h;
  }

  function applyPreset(w: number, h: number) {
    setWidthRaw(String(w));
    setHeightRaw(String(h));
    syncLockedAspect(w, h);
  }

  function onWidthChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "");
    setWidthRaw(cleaned);
    const w = parseDim(cleaned);
    if (w == null || !ratioLocked) return;
    const nextH = clampSide(Math.round(w / lockedAspectRef.current), w);
    setHeightRaw(String(nextH));
  }

  function onHeightChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "");
    setHeightRaw(cleaned);
    const h = parseDim(cleaned);
    if (h == null || !ratioLocked) return;
    const nextW = clampSide(Math.round(h * lockedAspectRef.current), h);
    setWidthRaw(String(nextW));
  }

  function stepWidth(delta: number) {
    const current = unitsW ?? PLOT_MIN;
    const next = clampSide(current + delta, unitsH);
    setWidthRaw(String(next));
    setActiveDim("w");
    if (ratioLocked) {
      const nextH = clampSide(Math.round(next / lockedAspectRef.current), next);
      setHeightRaw(String(nextH));
    }
  }

  function stepHeight(delta: number) {
    const current = unitsH ?? PLOT_MIN;
    const next = clampSide(current + delta, unitsW);
    setHeightRaw(String(next));
    setActiveDim("h");
    if (ratioLocked) {
      const nextW = clampSide(Math.round(next * lockedAspectRef.current), next);
      setWidthRaw(String(nextW));
    }
  }

  function onUrlChange(raw: string) {
    setUrl(stripUrlProtocol(raw));
  }

  function onOneLinerChange(raw: string) {
    setOneLiner(raw.slice(0, MAX_DESCRIPTION_CHARS));
  }

  function toggleRatioLock() {
    if (!ratioLocked && unitsW != null && unitsH != null && unitsH > 0) {
      syncLockedAspect(unitsW, unitsH);
    }
    setRatioLocked((v) => !v);
  }

  function goPay() {
    if (!draftSticker || !plotCheck.ok || unitsW == null || unitsH == null) {
      return;
    }
    const normalizedUrl = normalizeStickerUrl(url);
    if (!normalizedUrl) return;
    setPlaceDraft({
      sticker: draftSticker,
      unitsW,
      unitsH,
      details: {
        name: name.trim(),
        oneLiner: oneLiner.trim(),
        url: normalizedUrl,
        category,
      },
    });
    setStep("pay");
  }

  function mockPay() {
    setPaying(true);
    window.setTimeout(() => {
      setPaying(false);
      setStep("place");
    }, 900);
  }

  async function onPlace(x: number, y: number) {
    if (!draftSticker || saving) return;
    const draft = useWallStore.getState().placeDraft;
    if (!draft) return;

    setSaving(true);
    setSaveError(null);
    try {
      const published = await publishPlaceListing({
        details: draft.details,
        sticker: draft.sticker,
      });
      const placement = confirmPlacement(x, y, {
        stickerId: published.stickerId,
        slug: published.slug,
      });
      if (!placement) {
        throw new Error("Could not place sticker on the wall.");
      }
      setSavedSlug(published.slug);
      setStep("done");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save sticker.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <PlaceShell title="Placed">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 pb-16 text-center">
          <IconWell tone="success">
            <CheckCircle weight="fill" className="size-8" />
          </IconWell>
          <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[36px]">
            You&apos;re on the wall
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500">
            Your placement is permanent. Newer stickers can cover it —
            that&apos;s the game. Your sticker is in the directory either way.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
              onClick={() => {
                setDraftSticker(null);
                void navigate({ to: "/" });
              }}
            >
              See the wall
            </button>
            {savedSlug ? (
              <Link
                to="/sticker/$slug"
                params={{ slug: savedSlug }}
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                View listing
              </Link>
            ) : (
              <Link
                to="/directory"
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                Open directory
              </Link>
            )}
          </div>
        </main>
      </PlaceShell>
    );
  }

  if (step === "place" && draftSticker) {
    const placeW = placeDraft?.unitsW ?? unitsW;
    const placeH = placeDraft?.unitsH ?? unitsH;
    if (placeW == null || placeH == null || !validatePlot(placeW, placeH).ok) {
      return (
        <PlaceShell title="Place" backTo="/make" backLabel="Back to make">
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
            <IconWell>
              <GridFour weight="bold" className="size-7" />
            </IconWell>
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">
              Resume details
            </h2>
            <p className="max-w-xs text-[15px] leading-relaxed text-neutral-500">
              Plot size is missing. Go back and set width and height.
            </p>
            <button
              type="button"
              className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
              onClick={() => setStep("details")}
            >
              Edit details
            </button>
          </main>
        </PlaceShell>
      );
    }
    const placePrice = plotPrice(placeW, placeH);

    return (
      <div className="font-ui relative">
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-30 flex justify-center pt-[env(safe-area-inset-top)] sm:top-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-black/[0.06] bg-white/85 py-2.5 pr-5 pl-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <span className="grid size-9 place-items-center rounded-full bg-neutral-900 text-white">
              <PushPin weight="fill" className="size-4" />
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
                {saving
                  ? "Saving your sticker…"
                  : `Tap to place ${formatPlot(placeW, placeH)}`}
              </p>
              <p className="text-[12px] text-neutral-500">
                ${placePrice} paid · prototype
              </p>
            </div>
          </div>
        </div>
        {saveError ? (
          <p
            role="alert"
            className="pointer-events-none absolute top-[4.75rem] right-4 left-4 z-30 text-center text-[12px] font-medium text-red-600"
          >
            {saveError}
          </p>
        ) : null}
        <StickerWall
          placeMode={!saving}
          ghostW={unitsToPx(placeW)}
          ghostH={unitsToPx(placeH)}
          onPlace={(x, y) => void onPlace(x, y)}
        />
        <img
          src={draftSticker.imageDataUrl}
          alt=""
          className="pointer-events-none fixed right-4 bottom-4 z-30 size-16 object-contain opacity-90 drop-shadow-lg sm:size-20"
        />
      </div>
    );
  }

  if (!draftSticker) {
    return (
      <PlaceShell title="Place" backTo="/make" backLabel="Back to make">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
          <IconWell>
            <StickerIcon weight="fill" className="size-7" />
          </IconWell>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">
            No sticker yet
          </h2>
          <p className="max-w-xs text-[15px] leading-relaxed text-neutral-500">
            Make a sticker first, then come back to place it on the wall.
          </p>
          <Link
            to="/make"
            className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
          >
            <Plus weight="bold" className="size-4" />
            Create sticker
          </Link>
        </main>
      </PlaceShell>
    );
  }

  return (
    <PlaceShell
      title={step === "pay" ? "Checkout" : "Place sticker"}
      backTo={step === "details" ? "/make" : undefined}
      onBack={step === "pay" ? () => setStep("details") : undefined}
      backLabel={step === "pay" ? "Back to details" : "Back to make"}
      trailing={
        step === "details" && price != null ? (
          <span className="rounded-full bg-black/[0.045] px-3 py-1.5 text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-neutral-800">
            ${price}
          </span>
        ) : null
      }
    >
      <main className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-1 sm:px-6">
          <PlotPreview
            src={draftSticker.imageDataUrl}
            w={unitsW}
            h={unitsH}
            valid={plotCheck.ok}
            compact={step === "pay"}
          />

          {step === "details" ? (
            <div className="flex flex-col gap-6">
              <LimitLine />

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel
                    icon={
                      <ArrowsHorizontal weight="bold" className="size-3.5" />
                    }
                  >
                    Sticker Size Area
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={toggleRatioLock}
                    aria-pressed={ratioLocked}
                    aria-label={
                      ratioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"
                    }
                    className={cn(
                      "press grid size-8 place-items-center rounded-lg",
                      ratioLocked
                        ? "bg-neutral-900 text-white"
                        : "bg-black/[0.05] text-neutral-600",
                    )}
                  >
                    {ratioLocked ? (
                      <LockSimple weight="bold" className="size-3.5" />
                    ) : (
                      <LockSimpleOpen weight="bold" className="size-3.5" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-1.5">
                  <label
                    htmlFor="plot-w"
                    className="flex items-center justify-center gap-1 text-[12px] font-medium text-neutral-500"
                  >
                    <ArrowsHorizontal weight="bold" className="size-3.5" />
                    Width
                  </label>
                  <span aria-hidden className="block" />
                  <label
                    htmlFor="plot-h"
                    className="flex items-center justify-center gap-1 text-[12px] font-medium text-neutral-500"
                  >
                    <ArrowsVertical weight="bold" className="size-3.5" />
                    Height
                  </label>

                  <DimStepper
                    id="plot-w"
                    value={widthRaw}
                    min={plotSideBounds(unitsH).min}
                    max={plotSideBounds(unitsH).max}
                    invalid={Boolean(widthWarn) && activeDim === "w"}
                    onChange={onWidthChange}
                    onStep={stepWidth}
                    onFocus={() => setActiveDim("w")}
                    onBlur={() => setActiveDim((d) => (d === "w" ? null : d))}
                  />
                  <div className="flex h-11 items-center justify-center text-[15px] font-medium text-neutral-300">
                    ×
                  </div>
                  <DimStepper
                    id="plot-h"
                    value={heightRaw}
                    min={plotSideBounds(unitsW).min}
                    max={plotSideBounds(unitsW).max}
                    invalid={Boolean(heightWarn) && activeDim === "h"}
                    onChange={onHeightChange}
                    onStep={stepHeight}
                    onFocus={() => setActiveDim("h")}
                    onBlur={() => setActiveDim((d) => (d === "h" ? null : d))}
                  />

                  {activeDim === "w" ? (
                    widthWarn ? (
                      <p className="col-start-1 flex items-start justify-center gap-1 text-center text-[11px] font-medium leading-snug text-red-600">
                        <WarningCircle
                          weight="fill"
                          className="mt-px size-3.5 shrink-0"
                        />
                        {widthWarn}
                      </p>
                    ) : (
                      <p className="col-start-1 text-center text-[11px] text-neutral-400">
                        {PLOT_MIN}–{PLOT_MAX}
                        {unitsH != null
                          ? ` · min ${plotSideBounds(unitsH).min}`
                          : ""}
                      </p>
                    )
                  ) : (
                    <span className="col-start-1 block h-[16px]" aria-hidden />
                  )}
                  <span aria-hidden className="block" />
                  {activeDim === "h" ? (
                    heightWarn ? (
                      <p className="col-start-3 flex items-start justify-center gap-1 text-center text-[11px] font-medium leading-snug text-red-600">
                        <WarningCircle
                          weight="fill"
                          className="mt-px size-3.5 shrink-0"
                        />
                        {heightWarn}
                      </p>
                    ) : (
                      <p className="col-start-3 text-center text-[11px] text-neutral-400">
                        {PLOT_MIN}–{PLOT_MAX}
                        {unitsW != null
                          ? ` · min ${plotSideBounds(unitsW).min}`
                          : ""}
                      </p>
                    )
                  ) : (
                    <span className="col-start-3 block h-[16px]" aria-hidden />
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PICKER_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.w, preset.h)}
                        className={cn(
                          "press h-8 rounded-lg px-3 text-[13px] font-medium tracking-[-0.01em] tabular-nums",
                          active
                            ? "bg-neutral-900 text-white"
                            : "bg-black/[0.05] text-neutral-700 hover:bg-black/[0.08]",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (activePresetId) setRatioLocked(false);
                      setActiveDim("w");
                      document.getElementById("plot-w")?.focus();
                    }}
                    className={cn(
                      "press h-8 rounded-lg px-3 text-[13px] font-medium tracking-[-0.01em]",
                      isCustom
                        ? "bg-neutral-900 text-white"
                        : "bg-black/[0.05] text-neutral-700 hover:bg-black/[0.08]",
                    )}
                  >
                    Custom
                  </button>
                </div>

                {plotCheck.ok ? (
                  <p className="text-[13px] text-neutral-500">
                    Area {unitsW! * unitsH!} ·{" "}
                    <span className="font-semibold text-neutral-900">
                      ${price}
                    </span>
                  </p>
                ) : null}
              </section>

              <section className="space-y-4">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-neutral-900">
                  Sticker details
                </h2>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="name"
                    icon={<Tag weight="bold" className="size-3.5" />}
                  >
                    Title
                  </FieldLabel>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ShipKit"
                    autoComplete="off"
                    className={fieldSurface}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="blurb"
                    icon={<TextAlignLeft weight="bold" className="size-3.5" />}
                    hint={`${oneLiner.length}/${MAX_DESCRIPTION_CHARS}`}
                  >
                    Short description
                  </FieldLabel>
                  <Textarea
                    id="blurb"
                    value={oneLiner}
                    onChange={(e) => onOneLinerChange(e.target.value)}
                    maxLength={MAX_DESCRIPTION_CHARS}
                    placeholder="Launch checklists that actually get checked."
                    className={textareaSurface}
                  />
                  {oneLiner.length >= MAX_DESCRIPTION_CHARS ? (
                    <p className="text-[11px] font-medium text-neutral-500">
                      Maximum {MAX_DESCRIPTION_CHARS} characters.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="url"
                    icon={<LinkSimple weight="bold" className="size-3.5" />}
                  >
                    Link
                  </FieldLabel>
                  <InputGroup
                    className={cn(
                      fieldSurface,
                      "px-0 has-[[data-slot=input-group-control]:focus-visible]:border-black/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white",
                    )}
                  >
                    <InputGroupAddon
                      align="inline-start"
                      className="pl-4 text-[15px] text-neutral-400"
                    >
                      <InputGroupText className="text-[15px] text-neutral-400">
                        https://
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="url"
                      value={url}
                      onChange={(e) => onUrlChange(e.target.value)}
                      placeholder="yourproduct.dev"
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="h-full border-0 bg-transparent px-0 text-[15px] tracking-[-0.01em] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0"
                    />
                  </InputGroup>
                  {url.trim() && !isValidStickerUrl(url) ? (
                    <p className="text-[12px] font-medium text-red-600">
                      Enter a valid website (e.g. yoursite.com).
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="category"
                    icon={<FolderSimple weight="bold" className="size-3.5" />}
                  >
                    Category
                  </FieldLabel>
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      if (value) setCategory(value as Category);
                    }}
                  >
                    <SelectTrigger
                      id="category"
                      className={cn(
                        fieldSurface,
                        "w-full justify-between px-4 font-normal",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="rounded-xl border border-black/[0.06] bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.25)]"
                    >
                      {CATEGORIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          className="rounded-lg text-[15px]"
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <button
                type="button"
                className="nk-btn mt-1 w-full"
                disabled={!canContinue}
                onClick={goPay}
              >
                Continue to pay
                {price != null ? ` · $${price}` : ""}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[32px]">
                  Pay ${price}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                  You&apos;re buying a{" "}
                  <strong>
                    {unitsW != null && unitsH != null
                      ? formatPlot(unitsW, unitsH)
                      : "—"}
                  </strong>{" "}
                  plot — ${price} for {unitsW! * unitsH!} units of wall. Mock
                  payment for this prototype.
                </p>
              </div>

              <div className="w-full rounded-[22px] bg-[#f5f5f7] p-4 text-[14px]">
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex min-w-0 items-center gap-2 truncate pr-3">
                    <StickerIcon
                      weight="fill"
                      className="size-4 shrink-0 text-neutral-400"
                    />
                    <span className="truncate">{name || "Your sticker"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    <GridFour weight="bold" className="size-3.5" />
                    {unitsW != null && unitsH != null
                      ? formatPlot(unitsW, unitsH)
                      : "—"}
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
                  <span>Total</span>
                  <span className="tabular-nums">${price}</span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  className="nk-btn flex-1"
                  disabled={paying}
                  onClick={mockPay}
                >
                  <CreditCard weight="bold" className="size-4" />
                  {paying ? "Processing…" : `Pay $${price}`}
                </button>
                <button
                  type="button"
                  className="nk-btn-secondary"
                  onClick={() => setStep("details")}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </PlaceShell>
  );
}
