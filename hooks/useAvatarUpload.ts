import { useState } from "react";
import { toast } from "sonner";

export function useAvatarUpload(initial: string | null = null) {
  const [url, setUrl] = useState<string | null>(initial);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "avatar");
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Ошибка загрузки");
        return;
      }
      const { url: newUrl } = await res.json();
      setUrl(newUrl);
      toast.success("Фото загружено");
    } catch {
      toast.error("Ошибка загрузки фото");
    } finally {
      setUploading(false);
    }
  };

  return { url, setUrl, uploading, upload };
}
