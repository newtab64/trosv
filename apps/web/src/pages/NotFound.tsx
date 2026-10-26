import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { NotFoundIllustration } from "@/ui/icons";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Không tìm thấy trang · TROSV");
  return (
    <div className="mx-auto max-w-2xl px-5">
      <EmptyState
        illustration={<NotFoundIllustration />}
        title="Không tìm thấy trang này"
        description="Đường dẫn không tồn tại hoặc đã bị dời. Bạn về trang chủ hoặc xem danh sách phòng nhé."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary">
              <Link to={ROUTES.HOME}>Về trang chủ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={ROUTES.ROOMS}>Xem phòng trọ</Link>
            </Button>
          </div>
        }
        className="min-h-[60vh]"
      />
    </div>
  );
}
