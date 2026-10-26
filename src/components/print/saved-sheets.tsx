import { Link } from "@tanstack/react-router"
import { Plus, Printer } from "@phosphor-icons/react"
import type { PrintSheetSummary } from "@/lib/print-layout"

export function SavedSheets({ sheets }: { sheets: PrintSheetSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      <li>
        <Link
          to="/print"
          className="group flex h-full flex-col rounded-[22px] border border-dashed border-[#d9c7a3] bg-[#fbf8f2] p-3 transition-colors hover:bg-[#f6efe2]"
        >
          <span className="grid h-40 place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-white text-[#8c5a14] shadow-[0_0_0_1px_rgba(60,40,10,0.08)] transition-transform group-hover:scale-105">
              <Plus weight="bold" className="size-5" />
            </span>
          </span>
          <span className="mt-3 px-1 text-[15px] font-semibold tracking-[-0.02em] text-neutral-900">
            New paper
          </span>
          <span className="px-1 text-[12px] text-[#8c7a5b]">
            {sheets.length
              ? "Arrange stickers from your wall"
              : "No saved prints yet"}
          </span>
        </Link>
      </li>
      {sheets.map((sheet) => (
        <li key={sheet.id} className="relative">
          <Link
            to="/print"
            search={{ sheet: sheet.id }}
            className="group flex h-full flex-col rounded-[22px] bg-white p-3 shadow-[0_0_0_1px_rgba(60,40,10,0.08)] transition-shadow hover:shadow-[0_0_0_1px_rgba(60,40,10,0.12),0_12px_30px_-16px_rgba(60,40,10,0.35)]"
          >
            <span className="grid h-40 place-items-center rounded-[16px] bg-[#f5f5f7] p-4">
              <SheetThumb sheet={sheet} />
            </span>
            <span className="mt-3 truncate px-1 text-[15px] font-semibold tracking-[-0.02em] text-neutral-900">
              {sheet.name}
            </span>
            <span className="px-1 text-[12px] text-[#8c7a5b]">
              {sheet.stickerCount}{" "}
              {sheet.stickerCount === 1 ? "sticker" : "stickers"} ·{" "}
              {sheet.widthMm}×{sheet.heightMm} mm
            </span>
          </Link>
          <Link
            to="/print"
            search={{ sheet: sheet.id, print: true }}
            aria-label={`Print ${sheet.name}`}
            className="press absolute top-5 right-5 grid size-9 place-items-center rounded-full bg-white/90 text-neutral-800 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)] backdrop-blur transition-transform hover:text-neutral-950 active:scale-[0.95]"
          >
            <Printer weight="bold" className="size-4" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function SheetThumb({ sheet }: { sheet: PrintSheetSummary }) {
  const portrait = sheet.heightMm >= sheet.widthMm
  const pct = (value: number, total: number) => `${(value / total) * 100}%`
  return (
    <span
      className="relative block overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_16px_-8px_rgba(0,0,0,0.25)]"
      style={{
        aspectRatio: `${sheet.widthMm} / ${sheet.heightMm}`,
        height: portrait ? "100%" : "auto",
        width: portrait ? "auto" : "100%",
      }}
    >
      {sheet.preview.map((copy) => (
        <img
          key={copy.id}
          src={copy.imageUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute object-contain"
          style={{
            left: pct(copy.xMm, sheet.widthMm),
            top: pct(copy.yMm, sheet.heightMm),
            width: pct(copy.wMm, sheet.widthMm),
            height: pct(copy.hMm, sheet.heightMm),
          }}
        />
      ))}
    </span>
  )
}
