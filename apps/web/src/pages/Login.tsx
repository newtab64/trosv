import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { ART_ASSETS } from "@/constants/assets";
import { errMessage } from "@/api/axiosClient";
import { useAuthForm } from "@/hooks/useAuthForm";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Input } from "@/ui/input";
import { PasswordInput } from "@/ui/password-input";
import { AuthSplit } from "@/components/AuthSplit";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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
      throw new Error("Chưa điền đủ thông tin");
    }
    setErrors({});
    await login(email.trim(), password);
    const from =
      typeof location.state === "object" &&
      location.state != null &&
      "from" in location.state &&
      typeof (location.state as { from: unknown }).from === "string"
        ? (location.state as { from: string }).from
        : ROUTES.HOME;
    void navigate(from, { replace: true });
  }

  const form = useAuthForm({
    submit,
    onError: (err) => { setErrors({
        form:
          errMessage(err, "Đăng nhập không thành công. Bạn kiểm tra lại email và mật khẩu nhé.") !==
          "Chưa điền đủ thông tin"
            ? errMessage(err, "Đăng nhập không thành công. Bạn kiểm tra lại email và mật khẩu nhé.")
            : "",
      }); },
  });

  return (
    <AuthSplit artSrc={ART_ASSETS.AUTH_STUDENT} title="Đăng nhập" artTestId="login-art">
          <form onSubmit={(e) => { void form.handleSubmit(e); }} className="flex flex-col gap-4">
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
                onChange={(e) => { setEmail(e.target.value); }}
                invalid={!!errors["email"]}
              />
            </Field>
            <Field id="login-password" label="Mật khẩu" error={errors["password"]} required>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
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

      <p className="mt-6 rounded-xl border border-line bg-tint p-3 text-center text-xs text-muted">
        Tài khoản dùng thử: student1@example.com hoặc landlord1@example.com, mật khẩu password
      </p>
    </AuthSplit>
  );
}

/* Password input with a show/hide toggle. */
