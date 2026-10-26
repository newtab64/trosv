import { ErrorState } from "@/ui/empty-state";
import { Button } from "@/ui/button";

export function ErrorBoundary() {
  return (
    <ErrorState
      title="Đã xảy ra lỗi"
      message="Trang không tải được. Bạn thử tải lại hoặc về trang chủ nhé."
      action={
        <Button onClick={() => { window.location.reload(); }}>Tải lại trang</Button>
      }
      className="min-h-[60vh]"
    />
  );
}
