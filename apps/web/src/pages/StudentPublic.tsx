import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import api, { errStatus } from "@/api/axiosClient";
import type { User } from "@/types/api";
import { Button } from "@/ui/button";
import { Avatar } from "@/ui/avatar";
import { EmptyState } from "@/ui/empty-state";
import { Skeleton } from "@/ui/badge";
import { NotFoundIllustration } from "@/ui/icons";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { startDirectConversation } from "@/api/socialApi";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/ui/toast";
import { parseHobbies } from "@/constants/hobbies";

export default function StudentPublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(profile ? `${profile.name} · TROSV` : "Hồ sơ sinh viên · TROSV");

  useEffect(() => {
    let active = true;
    api
      .get<{ data: User }>(`/users/${id}`)
      .then((r) => {
        if (active) setProfile(r.data.data);
      })
      .catch((err: unknown) => {
        if (errStatus(err) === 404 && active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (notFound) {
    return (
      <EmptyState
        illustration={<NotFoundIllustration />}
        title="Không tìm thấy hồ sơ"
        description="Hồ sơ này không tồn tại hoặc đã bị xóa."
        action={
          <Button asChild variant="outline">
            <a href={ROUTES.HOME}>Về trang chủ</a>
          </Button>
        }
        className="min-h-[60vh]"
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg p-5">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-2 h-6 w-48" />
      </div>
    );
  }

  if (!profile) return null;
  /* Capture the non-null value for closures below. */
  const profileData = profile;

  const hobbies = parseHobbies(profile.interests ?? profile.hobby);

  async function sendMessage(): Promise<void> {
    if (!user) {
      void navigate(ROUTES.LOGIN);
      return;
    }
    try {
      const conv = await startDirectConversation(profileData.id);
      void navigate(route(ROUTES.CONVERSATION, { id: conv.id }));
    } catch {
      toast("Không mở được hội thoại. Bạn thử lại nhé.");
    }
  }

  return (
    <div className="mx-auto max-w-lg p-5 pb-16">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-card p-8 text-center">
        <Avatar name={profile.name} size={96} />
        <h1 className="text-3xl font-bold tracking-tight text-ink">{profile.name}</h1>
        <p className="text-sm font-medium text-muted">{profile.school ?? "Chưa rõ trường"}</p>
        {profile.bio ? (
          <p className="text-base text-ink-2 leading-relaxed">{profile.bio}</p>
        ) : null}
        {hobbies.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {hobbies.map((h) => (
              <span
                key={h.key}
                className="inline-flex items-center rounded-full border border-line bg-tint/40 px-3 py-1 text-xs font-medium text-ink"
              >
                <span>{h.label}</span>
              </span>
            ))}
          </div>
        ) : null}
        {user && user.id !== profile.id ? (
          <Button variant="primary" className="mt-4" onClick={() => void sendMessage()}>
            Nhắn tin
          </Button>
        ) : null}
      </div>
    </div>
  );
}
