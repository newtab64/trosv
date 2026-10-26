import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { ART_ASSETS } from "@/constants/assets";
import { errFieldErrors, errMessage } from "@/api/axiosClient";
import { useAuthForm } from "@/hooks/useAuthForm";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Input } from "@/ui/input";
import { AuthSplit } from "@/components/AuthSplit";
import { PasswordInput } from "@/ui/password-input";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { RegisterPayload, UserRole } from "@/types/api";

export default function Register() {
  useDocumentTitle("Đăng ký · TROSV");
  const { register } = useAuth();
  const navigate = useNavigate();
  const role: UserRole = "student";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [pickedRole, setPickedRole] = useState<"student" | "landlord">(role);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");

  async function submit(): Promise<void> {
    setFieldErrors({});
    setFormError("");
    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: ["Mật khẩu nhập lại chưa khớp."] });
      throw new Error("Mật khẩu chưa khớp");
    }
    const payload: RegisterPayload = {
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
      role: pickedRole,
    };
    await register(payload);
    void navigate(ROUTES.HOME, { replace: true });
  }

  const form = useAuthForm({
    submit,
    onError: (err) => {
      setFieldErrors(errFieldErrors(err));
      setFormError(errMessage(err, "Đăng ký không thành công. Bạn thử lại nhé."));
    },
  });

  /* Vietnamese inline validation messages mapped from 422 errors per field. */
  const err = (field: string): string | undefined => fieldErrors[field]?.[0];

  return (
    <AuthSplit
      artSrc={ART_ASSETS.AUTH_LANDLORD}
      title="Tạo tài khoản"
      artTestId="register-art"
    >
      <form onSubmit={(e) => { void form.handleSubmit(e); }} className="flex flex-col gap-4">
        {formError ? (
          <p role="alert" className="rounded-xl bg-plate-tint p-3 text-sm text-ink">
            {formError}
          </p>
        ) : null}
        <fieldset className="grid grid-cols-2 gap-2.5" aria-label="Chọn vai trò">
          {(
            [
              { value: "student", label: "Tôi tìm phòng" },
              { value: "landlord", label: "Tôi cho thuê" },
            ] as const
          ).map((r) => {
            const isSelected = pickedRole === r.value;
            return (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-all text-center select-none focus-within:ring-2 focus-within:ring-plate",
                  isSelected
                    ? "border-plate bg-plate font-bold text-white shadow-xs"
                    : "border-line-strong bg-card text-ink hover:border-plate hover:bg-tint font-medium"
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={isSelected}
                  onChange={() => { setPickedRole(r.value); }}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    isSelected ? "bg-white" : "bg-muted/40"
                  )}
                  aria-hidden
                />
                {r.label}
              </label>
            );
          })}
        </fieldset>
        <Field id="name" label="Tên" error={err("name")} required>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            invalid={!!err("name")}
          />
        </Field>
        <Field id="email" label="Email" error={err("email")} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            invalid={!!err("email")}
          />
        </Field>
        <Field
          id="password"
          label="Mật khẩu"
          error={err("password")}
          required
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            invalid={!!err("password")}
          />
        </Field>
        <PasswordChecklist password={password} confirmation={passwordConfirmation} />
        <Field id="password_confirmation" label="Nhập lại mật khẩu" error={err("password_confirmation")} required>
          <PasswordInput
            id="password_confirmation"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => { setPasswordConfirmation(e.target.value); }}
            invalid={!!err("password_confirmation")}
          />
        </Field>
        <Button type="submit" variant="primary" loading={form.busy} className="mt-2 w-full">
          Tạo tài khoản
        </Button>
        <p className="text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link to={ROUTES.LOGIN} className="font-medium text-ink underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthSplit>
  );
}

/* Live password checklist (Zillow lists "Your password must contain:").
   Purely client-side guidance; the server still validates on submit. */
function PasswordChecklist({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  const checks = [
    { ok: password.length >= 8, label: "Tối thiểu 8 ký tự" },
    {
      ok: password !== "" && password === confirmation,
      label: "Hai mật khẩu khớp nhau",
    },
  ];
  return (
    <ul className="flex flex-col gap-1" aria-live="polite">
      {checks.map((c) => (
        <li
          key={c.label}
          className={cn(
            "flex items-center gap-2 text-xs",
            c.ok ? "font-medium text-ink" : "text-muted"
          )}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              c.ok ? "border-moss bg-moss text-white" : "border-line-strong text-transparent"
            )}
            aria-hidden
          >
            <Check className="size-3" />
          </span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}
