import { Field } from "@/ui/field";
import { controlClass } from "@/ui/input";

const SELECT_CLASS = `${controlClass()} h-11 px-3 text-sm`;

export interface Option {
  value: string;
  label: string;
  /** Short hint shown in brackets after the label. */
  sub: string;
}

/** A labelled dropdown with a "Chưa chọn" empty choice; options read "Label (hint)". */
export function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={SELECT_CLASS}
      >
        <option value="">Chưa chọn</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.sub})
          </option>
        ))}
      </select>
    </Field>
  );
}
