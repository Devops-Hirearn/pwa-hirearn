import { uploadFileWithPresign } from "../uploads/presign";
import { apiRequest } from "./client";
import type { AppUser } from "./types";

function normalizeUser(raw: Record<string, unknown> | null | undefined): AppUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = { ...raw } as Record<string, unknown>;
  if (u._id && !u.id) u.id = String(u._id);
  return u as unknown as AppUser;
}

export async function updateEmployerProfile(body: Record<string, unknown>): Promise<AppUser | null> {
  const data = await apiRequest<Record<string, unknown>>("/users/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const raw = (data.user ?? data) as Record<string, unknown>;
  return normalizeUser(raw);
}

/**
 * Employer KYC: presign each file to S3, then JSON body with *Key fields (same as mobile).
 * Avoids multer/local disk so cloud deploys stay consistent.
 */
export async function submitEmployerIdentityViaPresign(files: {
  aadhaarFront: File;
  aadhaarBack: File;
  panCard: File;
  selfie: File;
}) {
  const [front, back, pan, selfie] = await Promise.all([
    uploadFileWithPresign(files.aadhaarFront),
    uploadFileWithPresign(files.aadhaarBack),
    uploadFileWithPresign(files.panCard),
    uploadFileWithPresign(files.selfie),
  ]);
  return apiRequest<Record<string, unknown>>("/users/identity-verification", {
    method: "POST",
    body: JSON.stringify({
      aadhaarFrontKey: front.key,
      aadhaarBackKey: back.key,
      panCardKey: pan.key,
      selfieKey: selfie.key,
    }),
  });
}

/** Full profile payload from `GET /users/profile` (employer fields, bank, etc.). */
export async function fetchUserProfileRecord(): Promise<Record<string, unknown>> {
  const data = await apiRequest<{ user?: Record<string, unknown> }>("/users/profile");
  const u = data.user;
  if (!u || typeof u !== "object") {
    throw new Error("Could not load profile");
  }
  return u;
}

export async function updateBankAccountApi(body: {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}) {
  return apiRequest<Record<string, unknown>>("/users/bank-account", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function uploadProfilePhotoFile(file: File): Promise<AppUser | null> {
  const { publicUrl } = await uploadFileWithPresign(file);
  return updateEmployerProfile({ profilePhoto: publicUrl });
}
