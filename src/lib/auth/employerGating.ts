import type { AppUser } from "@/lib/api/types";

/** Same document requirements as mobile `RootNavigator` before main access. */
export function employerHasRequiredIdentityDocs(user: AppUser | null): boolean {
  if (!user) return false;
  const id = user.identityDocuments as Record<string, unknown> | undefined;
  if (!id || typeof id !== "object") return false;
  const three = !!(id.aadhaarFront && id.aadhaarBack && id.selfie);
  /** Backend `uploadIdentityDocuments` requires PAN for employers before marking KYC pending. */
  if (user.role === "employer") {
    return three && !!id.panCard;
  }
  return three;
}

/**
 * If non-null, employer must be sent to this path before using the main shell.
 * Admins are never gated here.
 */
export function getEmployerOnboardingPath(user: AppUser | null): string | null {
  if (!user?.role || user.isAdmin) return null;
  if (user.role !== "employer") return null;
  if (!user.isProfileComplete) return "/onboarding/employer-profile";
  if (!employerHasRequiredIdentityDocs(user)) return "/onboarding/kyc";
  return null;
}
