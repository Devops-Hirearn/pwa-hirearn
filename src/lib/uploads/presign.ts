import { apiRequest } from "../api/client";

export async function uploadFileWithPresign(file: File): Promise<{ publicUrl: string; key: string; name: string }> {
  const filename = file.name || `upload_${Date.now()}`;
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const contentType =
    file.type || (ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg");

  const presign = await apiRequest<{ uploadUrl: string; key: string; publicUrl: string }>(
    "/uploads/presign",
    {
      method: "POST",
      body: JSON.stringify({ filename, contentType }),
    },
  );

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Upload failed (" + put.status + ")");
  }
  return { publicUrl: presign.publicUrl, key: presign.key, name: filename };
}
