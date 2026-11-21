import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ROUTES } from "@/shared/constants/routes";
import { ART_ASSETS } from "@/shared/constants/assets";
import { errMessage } from "@/shared/api/axiosClient";
import { FormValidationError, useAuthForm } from "@/features/auth/hooks/useAuthForm";
import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";
import { AuthSplit } from "@/features/auth/components/AuthSplit";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export default function Login() {
  useDocumentTitle("Đăng nhập · TROSV");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(): Promise<void> {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors["email"] = "Bạn cần nhập email.";
    if (!password) nextErrors["password"] = "Bạn cần nhập mật khẩu.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      throw new FormValidationError();
    }
    setErrors({});
    await login(email.trim(), password);
  }

  // Back to the page the user was sent away from (ProtectedRoute puts it in
  // location.state.from), otherwise home. Must be afterSuccess: the hook's default
  // navigation to home would otherwise run after, and win over, this one.
  function redirectTarget(): string {
    const state: unknown = location.state;
    if (typeof state === "object" && state != null && "from" in state) {
      const from = state.from;
      if (typeof from === "string") return from;
    }
    return ROUTES.HOME;
  }

  const form = useAuthForm({
    submit,
    afterSuccess: () => {
      void navigate(redirectTarget(), { replace: true });
    },
    onError: (err) => {
      setErrors({
        form: errMessage(
          err,
          "Đăng nhập không thành công. Bạn kiểm tra lại email và mật khẩu nhé.",
        ),
      });
    },
  });

  return (
    <AuthSplit artSrc={ART_ASSETS.AUTH_STUDENT} title="Đăng nhập" artTestId="login-art">
      <form
        onSubmit={(e) => {
          void form.handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        {errors["form"] ? (
          <p role="alert" className="rounded-xl bg-plate-tint p-3 text-sm text-ink">
            {errors["form"]}
          </p>
        ) : null}
        <Field id="login-email" label="Email" error={errors["email"]} required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            invalid={!!errors["email"]}
          />
        </Field>
        <Field id="login-password" label="Mật khẩu" error={errors["password"]} required>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            invalid={!!errors["password"]}
          />
        </Field>
        <Button type="submit" loading={form.busy} className="mt-2 w-full" variant="primary">
          Đăng nhập
        </Button>
        <p className="text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link to={ROUTES.REGISTER} className="font-medium text-ink underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </AuthSplit>
  );
}

/* Password input with a show/hide toggle. */
