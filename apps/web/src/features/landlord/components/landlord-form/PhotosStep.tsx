import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Plus, X } from "lucide-react";
import { Tag } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MAX_PHOTOS } from "../../lib/listingFormModel";
import { useObjectUrls } from "../../hooks/useObjectUrls";
import { SECTION } from "./styles";
import type { ListingFormApi } from "./types";

const REMOVE_BUTTON =
  "absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full " +
  "bg-card/90 text-ink hover:bg-card";

type FormProps = { form: ListingFormApi };

/** Drag and drop area; clicking it or pressing Enter/Space opens the file picker. */
function Dropzone({ form: f, openPicker }: FormProps & { openPicker: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    f.pickFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDrop={onDrop}
      onClick={openPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openPicker();
      }}
      aria-label="Chọn hoặc kéo thả ảnh"
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl",
        "border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-plate bg-plate-tint/50" : "border-line-strong bg-tint",
      )}
    >
      <p className="text-sm font-medium text-ink">Kéo thả ảnh vào đây, hoặc bấm để chọn</p>
      <p className="text-xs text-muted">JPG, PNG hoặc WebP · tối đa 5 ảnh · mỗi ảnh 5 MB</p>
    </div>
  );
}

function Thumb({
  src,
  cover,
  removeLabel,
  onRemove,
  onMakeCover,
}: {
  src: string | undefined;
  cover: boolean;
  removeLabel: string;
  onRemove: () => void;
  onMakeCover?: (() => void) | undefined;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-sunken">
      <img src={src} alt="" width={200} height={133} className="aspect-3/2 w-full object-cover" />
      {cover ? (
        <span className="absolute left-1.5 top-1.5">
          <Tag>Ảnh bìa</Tag>
        </span>
      ) : null}
      {onMakeCover ? (
        <button
          type="button"
          onClick={onMakeCover}
          className="absolute bottom-1.5 left-1.5 rounded-sm bg-card/90 px-2 py-0.5 text-xs font-medium text-ink hover:bg-card"
        >
          Đặt làm ảnh bìa
        </button>
      ) : null}
      <button type="button" aria-label={removeLabel} onClick={onRemove} className={REMOVE_BUTTON}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Step 3: the photos already on the listing plus the new ones, picked in as many rounds as needed. */
export function PhotosStep({ form: f }: FormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useObjectUrls(f.newFiles);
  const existing = f.isEdit ? f.images : [];
  const total = existing.length + f.newFiles.length;
  // The cover is the oldest photo on the listing and the API cannot change it, so a new
  // photo can only be made the cover while the listing has none yet.
  const canChooseCover = existing.length === 0;
  const openPicker = () => fileInput.current?.click();

  return (
    <section className={SECTION}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ảnh</h2>
        <span className="text-sm text-muted tabular-nums">{`${String(total)}/${String(MAX_PHOTOS)} ảnh`}</span>
      </div>
      <Dropzone form={f} openPicker={openPicker} />
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={f.handleFilePick}
      />
      {f.photoNotices.length > 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-danger/25 bg-danger-tint p-3 text-sm text-ink"
        >
          {f.photoNotices.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      ) : null}
      {total > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {existing.map((img, i) => (
            <Thumb
              key={img.id}
              src={img.url}
              cover={i === 0}
              removeLabel={`Xóa ảnh ${String(i + 1)}`}
              onRemove={() => void f.handleDeleteImage(img.id)}
            />
          ))}
          {f.newFiles.map((file, i) => (
            <Thumb
              key={`${file.name}-${String(file.size)}-${String(file.lastModified)}`}
              src={urls[i]}
              cover={canChooseCover && i === 0}
              removeLabel={`Xóa ảnh ${String(existing.length + i + 1)}`}
              onRemove={() => {
                f.removeNewFile(i);
              }}
              onMakeCover={
                canChooseCover && i > 0
                  ? () => {
                      f.makeCover(i);
                    }
                  : undefined
              }
            />
          ))}
          {total < MAX_PHOTOS ? (
            <button
              type="button"
              aria-label="Thêm ảnh"
              onClick={openPicker}
              className="flex aspect-3/2 items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-tint text-muted hover:text-ink"
            >
              <Plus className="size-6" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
