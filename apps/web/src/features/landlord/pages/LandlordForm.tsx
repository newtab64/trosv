import { useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ROUTES, route } from "@/shared/constants/routes";
import { useListingForm } from "@/features/landlord/hooks/useListingForm";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { toast } from "@/shared/ui/toast";
import { BasicsSection } from "../components/landlord-form/BasicsSection";
import { DescriptionSection } from "../components/landlord-form/DescriptionSection";
import { LocationStep } from "../components/landlord-form/LocationStep";
import type { ListingFormApi } from "../components/landlord-form/types";
import { PhotosStep } from "../components/landlord-form/PhotosStep";
import { ReviewSummary } from "../components/landlord-form/ReviewSummary";
import { WizardStepper } from "../components/landlord-form/WizardStepper";
import { useWizardSteps } from "../hooks/useWizardSteps";
import { stepOfField, type WizardStep } from "../lib/wizardModel";

const toastLike = {
  success: (m: string) => toast(m),
  error: (m: string) => toast(m),
};

type Wizard = ReturnType<typeof useWizardSteps>;

/** The one step that is showing: the last step also carries the review. */
function StepBody({ step, form }: { step: WizardStep; form: ListingFormApi }) {
  if (step === 0) return <LocationStep form={form} />;
  if (step === 1) return <BasicsSection form={form} />;
  if (step === 2) return <PhotosStep form={form} />;
  return (
    <>
      <DescriptionSection form={form} />
      <ReviewSummary form={form} />
    </>
  );
}

/** Cancel/back on the left; next, or the save button on the last step, on the right. */
function WizardFooter(props: { wizard: Wizard; form: ListingFormApi; onCancel: () => void }) {
  const { wizard, form, onCancel } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {wizard.step === 0 ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
      ) : (
        <Button type="button" variant="ghost" onClick={wizard.back}>
          ← Quay lại
        </Button>
      )}
      {/* Distinct keys: the same DOM button must not turn from "next" into "submit" in the
          middle of the click that reaches the last step, or the browser saves the listing. */}
      {wizard.isLast ? (
        <Button key="save" type="submit" variant="primary" loading={form.busy}>
          {form.isEdit ? "Lưu thay đổi" : "Đăng tin"}
        </Button>
      ) : (
        <Button key="next" type="button" variant="primary" onClick={wizard.next}>
          Tiếp tục →
        </Button>
      )}
    </div>
  );
}

/** Create or edit a listing: /landlord/new and /landlord/edit/:id. */
export default function LandlordForm() {
  const { id } = useParams();
  const numericId = id != null && id !== "new" ? Number(id) : undefined;
  useDocumentTitle(numericId != null ? "Sửa tin đăng · TROSV" : "Đăng tin mới · TROSV");
  const form = useListingForm(numericId, toastLike);
  const navigate = useNavigate();
  const wizard = useWizardSteps({
    form: form.form,
    isEdit: form.isEdit,
    setErrors: form.setErrors,
  });

  // A field the server rejected may live on an earlier step: take the landlord there.
  const { step, jumpTo } = wizard;
  useEffect(() => {
    const steps = Object.keys(form.errors)
      .map(stepOfField)
      .filter((s): s is WizardStep => s !== null);
    if (steps.length > 0 && !steps.includes(step)) jumpTo(Math.min(...steps) as WizardStep);
  }, [form.errors, step, jumpTo]);

  // Enter inside a field submits the form: before the last step it means "next".
  const onSubmit = (e: FormEvent): void => {
    if (wizard.isLast) {
      void form.handleSubmit(e, navigate);
      return;
    }
    e.preventDefault();
    wizard.next();
  };

  const cancel = () => {
    void navigate(
      form.isEdit ? route(ROUTES.LANDLORD_EDIT, { id: numericId ?? 0 }) : ROUTES.LANDLORD,
    );
  };

  return (
    <>
      <PageHeader
        title={form.isEdit ? "Sửa tin đăng" : "Đăng tin mới"}
        className="max-w-4xl"
        description={
          form.isEdit
            ? "Cập nhật thông tin phòng trọ, giá cả và tiện ích của bạn."
            : "Điền thông tin chi tiết về phòng trọ để thu hút sinh viên tìm phòng."
        }
      />

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-6 lg:p-8 pb-16">
        <Link
          to={ROUTES.LANDLORD}
          className={
            "mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted " +
            "hover:text-ink transition-colors w-fit"
          }
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span>Quay lại Quản lý tin đăng</span>
        </Link>

        <WizardStepper current={wizard.step} onJump={wizard.goTo} canJumpForward={form.isEdit} />

        {form.notice ? (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-plate-tint p-4 text-sm text-ink border border-plate/20"
          >
            {form.notice}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <StepBody step={wizard.step} form={form} />

          <WizardFooter wizard={wizard} form={form} onCancel={cancel} />
        </form>
      </div>
    </>
  );
}
