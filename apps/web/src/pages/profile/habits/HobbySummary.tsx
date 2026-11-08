import { Pencil } from "lucide-react";
import { HobbySelector } from "@/components/HobbySelector";
import { parseHobbies } from "@/constants/hobbies";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";

const MAX_SUMMARY_CHIPS = 6;

/** The first few hobbies as chips; the full picker opens in a dialog on request. */
export function HobbySummary({
  interests,
  error,
  onChange,
}: {
  interests: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const hobbies = parseHobbies(interests);
  const extra = hobbies.length - MAX_SUMMARY_CHIPS;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          Sở thích <span className="font-normal text-muted">· {hobbies.length}</span>
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Pencil className="size-3.5" aria-hidden />
              Sửa sở thích
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sở thích của bạn</DialogTitle>
              <DialogDescription>
                Sở thích chung giúp AI gợi ý bạn cùng phòng hợp với bạn hơn.
              </DialogDescription>
            </DialogHeader>
            <HobbySelector value={interests} onChange={onChange} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="primary">
                  Xong
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {hobbies.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {hobbies.slice(0, MAX_SUMMARY_CHIPS).map((h) => (
            <li
              key={h.key}
              className="rounded-full border border-line bg-tint/50 px-3 py-1 text-sm text-ink-2"
            >
              {h.label}
            </li>
          ))}
          {extra > 0 ? <li className="px-1 py-1 text-sm text-muted">+{extra}</li> : null}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">Chưa chọn sở thích nào.</p>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
