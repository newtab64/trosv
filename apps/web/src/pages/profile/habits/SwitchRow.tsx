import { Switch } from "@/ui/switch";

/** A title and description on the left, an on/off switch on the right. */
export function SwitchRow({
  title,
  description,
  checked,
  onChange,
  strong = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Heavier title, for the main opt-in switch. */
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={strong ? "text-sm font-semibold text-ink" : "text-sm font-medium text-ink"}>
          {title}
        </p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
