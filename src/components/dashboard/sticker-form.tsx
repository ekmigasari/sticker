import { useState } from "react"
import {
  Article,
  FolderSimple,
  LinkSimple,
  Tag,
  TextAlignLeft,
  Ticket,
} from "@phosphor-icons/react"
import {
  DEFAULT_CATEGORY,
  DETAIL_LIMITS,
  localIsoDate,
  type Category,
} from "@/domain/types"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"
import {
  AddDetailButton,
  CategorySelect,
  DateField,
  FieldLabel,
  RemoveDetailButton,
  fieldSurface,
  revealMotion,
  stripUrlProtocol,
  textareaSurface,
} from "@/components/sticker-fields"
import { isValidStickerUrl, normalizeStickerUrl } from "@/lib/sticker-meta"
import { cn } from "@/lib/utils"

export type StickerFormValues = {
  name: string
  oneLiner: string
  url: string
  category: Category
  description?: string
  offer?: string
  offerCode?: string
  offerExpiresOn?: string
}

type Props = {
  initial?: Partial<StickerFormValues>
  submitLabel: string
  onSubmit: (values: StickerFormValues) => Promise<void>
  onCancel?: () => void
}

export function StickerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "")
  const [oneLiner, setOneLiner] = useState(initial?.oneLiner ?? "")
  const [url, setUrl] = useState(stripUrlProtocol(initial?.url ?? ""))
  const [category, setCategory] = useState<Category>(
    initial?.category ?? DEFAULT_CATEGORY
  )
  const [description, setDescription] = useState(initial?.description ?? "")
  const [offer, setOffer] = useState(initial?.offer ?? "")
  const [offerCode, setOfferCode] = useState(initial?.offerCode ?? "")
  const [offerExpiresOn, setOfferExpiresOn] = useState(
    initial?.offerExpiresOn ?? ""
  )
  const [showDescription, setShowDescription] = useState(!!initial?.description)
  const [showPromo, setShowPromo] = useState(
    !!(initial?.offer || initial?.offerCode || initial?.offerExpiresOn)
  )
  const [revealed, setRevealed] = useState<"description" | "promo" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const urlInvalid = !!url.trim() && !isValidStickerUrl(url)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (urlInvalid) return
    setError(null)
    setPending(true)
    const text = (value: string) => value.trim() || undefined
    const values: StickerFormValues = {
      name: name.trim(),
      oneLiner: oneLiner.trim(),
      url: normalizeStickerUrl(url) ?? url.trim(),
      category,
      description: showDescription ? text(description) : undefined,
      offer: showPromo ? text(offer) : undefined,
      offerCode: showPromo ? text(offerCode) : undefined,
      offerExpiresOn: showPromo ? text(offerExpiresOn) : undefined,
    }
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-5 font-ui"
    >
      <div className="space-y-2">
        <FieldLabel
          htmlFor="name"
          icon={<Tag weight="bold" className="size-3.5" />}
        >
          Title
        </FieldLabel>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={DETAIL_LIMITS.name}
          placeholder="ShipKit"
          autoComplete="off"
          enterKeyHint="next"
          className={fieldSurface}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel
          htmlFor="oneLiner"
          icon={<TextAlignLeft weight="bold" className="size-3.5" />}
          hint={`${oneLiner.length}/${DETAIL_LIMITS.oneLiner}`}
        >
          Short description
        </FieldLabel>
        <Textarea
          id="oneLiner"
          required
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          maxLength={DETAIL_LIMITS.oneLiner}
          placeholder="Launch checklists that actually get checked."
          className={textareaSurface}
        />
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
            "px-0 has-[[data-slot=input-group-control]:focus-visible]:border-black/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white"
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
            required
            value={url}
            onChange={(e) => setUrl(stripUrlProtocol(e.target.value))}
            aria-invalid={urlInvalid || undefined}
            placeholder="yourproduct.dev"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-full border-0 bg-transparent px-0 text-base tracking-[-0.01em] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 sm:text-[15px]"
          />
        </InputGroup>
        {urlInvalid ? (
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
        <CategorySelect id="category" value={category} onChange={setCategory} />
      </div>

      {showDescription ? (
        <div className={cn("space-y-2", revealMotion)}>
          <FieldLabel
            htmlFor="description"
            icon={<Article weight="bold" className="size-3.5" />}
            hint={
              <span className="flex items-center gap-1">
                <span className="tabular-nums">
                  {description.length}/{DETAIL_LIMITS.description}
                </span>
                <RemoveDetailButton
                  label="Remove long description"
                  onClick={() => {
                    setDescription("")
                    setShowDescription(false)
                  }}
                />
              </span>
            }
          >
            Long description
          </FieldLabel>
          <Textarea
            id="description"
            autoFocus={revealed === "description"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DETAIL_LIMITS.description}
            placeholder="What it does, who it's for, and why you built it. Shown on your sticker page."
            className={cn(textareaSurface, "min-h-36")}
          />
        </div>
      ) : null}

      {showPromo ? (
        <div className={cn("space-y-2", revealMotion)}>
          <FieldLabel
            htmlFor="offer"
            icon={<Ticket weight="bold" className="size-3.5" />}
            hint={
              <RemoveDetailButton
                label="Remove promo"
                onClick={() => {
                  setOffer("")
                  setOfferCode("")
                  setOfferExpiresOn("")
                  setShowPromo(false)
                }}
              />
            }
          >
            Promo
          </FieldLabel>
          <Input
            id="offer"
            autoFocus={revealed === "promo"}
            required
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            maxLength={DETAIL_LIMITS.offer}
            placeholder="20% off your first year"
            autoComplete="off"
            className={fieldSurface}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label
                htmlFor="offerCode"
                className="block px-1 text-[12px] text-neutral-500"
              >
                Code <span className="text-neutral-400">· optional</span>
              </label>
              <Input
                id="offerCode"
                value={offerCode}
                onChange={(e) =>
                  setOfferCode(e.target.value.replace(/\s+/g, ""))
                }
                maxLength={DETAIL_LIMITS.offerCode}
                placeholder="LAUNCH20"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={cn(fieldSurface, "font-mono tracking-wide")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="offerExpiresOn"
                className="block px-1 text-[12px] text-neutral-500"
              >
                Ends on <span className="text-neutral-400">· optional</span>
              </label>
              <DateField
                id="offerExpiresOn"
                value={offerExpiresOn}
                min={localIsoDate()}
                onChange={setOfferExpiresOn}
                placeholder="No end date"
              />
            </div>
          </div>
          {offerExpiresOn ? (
            <p className="px-1 text-[12px] text-neutral-500">
              The promo disappears from your sticker after this date.
            </p>
          ) : null}
        </div>
      ) : null}

      {!showDescription || !showPromo ? (
        <div className="flex flex-wrap gap-2">
          {!showDescription ? (
            <AddDetailButton
              onClick={() => {
                setRevealed("description")
                setShowDescription(true)
              }}
            >
              Long description
            </AddDetailButton>
          ) : null}
          {!showPromo ? (
            <AddDetailButton
              onClick={() => {
                setRevealed("promo")
                setShowPromo(true)
              }}
            >
              Promo
            </AddDetailButton>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-[14px] font-medium text-red-600">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || urlInvalid}
          className="nk-btn"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="nk-btn-secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
