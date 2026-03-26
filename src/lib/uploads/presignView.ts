import { apiRequest } from "../api/client";

export async function getPresignedViewUrl(s3Url: string): Promise<string> {
  const data = await apiRequest<{ success?: boolean; signedUrl?: string; message?: string }>(
    "/uploads/presign-view",
    {
      method: "POST",
      body: JSON.stringify({ s3Url }),
    },
  );
  if (!data.signedUrl) {
    throw new Error(data.message || "Failed to get presigned URL");
  }
  return data.signedUrl;
}
