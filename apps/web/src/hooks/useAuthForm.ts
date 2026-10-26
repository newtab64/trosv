import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

/**
 * Logic form xác thực dùng chung cho Login/Register (debt #2 trong
 * docs/reports/TECH-DEBT.md): trạng thái busy, chặn submit kép, và điều hướng sau
 * khi thành công. Riêng phần trạng thái lỗi thuộc về từng page (Login dùng
 * chuỗi alert, Register dùng map lỗi theo field), nên page tự clear trong
 * `submit()` và map lỗi trong `onError(err)`.
 */
export interface UseAuthFormConfig {
  submit: () => Promise<void>;
  onError?: (err: unknown) => void;
  afterSuccess?: () => void;
}

export function useAuthForm({ submit, onError, afterSuccess }: UseAuthFormConfig): {
  busy: boolean;
  handleSubmit: (e: FormEvent) => Promise<void>;
} {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      await submit();
      if (afterSuccess) {
        afterSuccess();
      } else {
        void navigate(ROUTES.HOME, { replace: true });
      }
    } catch (err: unknown) {
      onError?.(err);
    } finally {
      setBusy(false);
    }
  }

  return { busy, handleSubmit };
}
