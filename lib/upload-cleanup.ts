import path from "path";
import { unlink } from "fs/promises";

const UPLOAD_URL_PREFIX = "/uploads/";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function isLocalUpload(
  url: string | null | undefined,
): url is string {
  return typeof url === "string" && url.startsWith(UPLOAD_URL_PREFIX);
}

export async function deleteLocalUpload(
  url: string | null | undefined,
): Promise<void> {
  if (!isLocalUpload(url)) return;
  const relative = url.slice(UPLOAD_URL_PREFIX.length);
  const filePath = path.resolve(UPLOAD_DIR, relative);
  if (
    filePath !== UPLOAD_DIR &&
    !filePath.startsWith(UPLOAD_DIR + path.sep)
  ) {
    return;
  }
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.error("[deleteLocalUpload]", url, err);
    }
  }
}

export async function deleteLocalUploads(
  urls: Array<string | null | undefined>,
): Promise<void> {
  await Promise.all(urls.map(deleteLocalUpload));
}
