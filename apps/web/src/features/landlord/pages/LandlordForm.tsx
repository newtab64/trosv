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
import { PhotosStep } from "../components/landlord-form/PhotosStep";

const toastLike = {
  success: (m: string) => toast(m),
  error: (m: string) => toast(m),
};

/** Create or edit a listing: /landlord/new and /landlord/edit/:id. */
export default function LandlordForm() {
  const { id } = useParams();
  const numericId = id != null && id !== "new" ? Number(id) : undefined;
  useDocumentTitle(numericId != null ? "Sửa tin đăng · TROSV" : "Đăng tin mới · TROSV");
  const form = useListingForm(numericId, toastLike);
  const navigate = useNavigate();

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

        {form.notice ? (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-plate-tint p-4 text-sm text-ink border border-plate/20"
          >
            {form.notice}
          </p>
        ) : null}

        <form onSubmit={(e) => void form.handleSubmit(e, navigate)} className="flex flex-col gap-6">
          <LocationStep form={form} />
          <BasicsSection form={form} />
          <DescriptionSection form={form} />
          <PhotosStep form={form} />

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={cancel}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={form.busy}>
              {form.isEdit ? "Lưu thay đổi" : "Đăng tin"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
