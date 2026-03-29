export interface SendOtpResponse {
  success: boolean;
  message: string;
  phoneNumber: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: Record<string, unknown>;
  isAdmin?: boolean;
  state?: string;
}

export interface AppUser {
  id: string;
  phoneNumber: string;
  fullName?: string;
  name?: string;
  email?: string;
  role: "worker" | "employer" | null;
  isPhoneVerified?: boolean;
  isProfileComplete?: boolean;
  isAdmin?: boolean;
  avatarUrl?: string;
  profilePhoto?: string;
  /** Employer daily job posting — aligned with mobile KYC gate */
  isIdentityVerified?: boolean;
  identityDocuments?: {
    verificationStatus?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    panCard?: string;
    selfie?: string;
  };
  [key: string]: unknown;
}

/** Normalized job (aligned with mobile `normalizeJob` / dashboard usage). */
export type EmployerJob = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: EmployerJobLocation | string;
  date?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  isMultiDay?: boolean;
  jobDays?: unknown[];
  workersNeeded: number;
  workersApproved: number;
  paymentPerWorker: number;
  status: string;
  jobType?: string;
  applications?: unknown[];
  employer?: unknown;
  monthlyMeta?: {
    salaryMin?: number;
    salaryMax?: number;
  };
  [key: string]: unknown;
};

export type EmployerJobLocation = {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
};

export interface WalletBalance {
  balance: number;
  pendingPayouts?: number;
  totalEarned?: number;
  totalPaidOut?: number;
}

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  createdAt: string;
  jobId?: string;
  jobTitle?: string;
  [key: string]: unknown;
}

export type ConversationUser = {
  id?: string;
  _id?: string;
  fullName?: string;
  phoneNumber?: string;
};

export type ConversationMessage = {
  content?: string;
  createdAt?: string;
};

export type Conversation = {
  user: ConversationUser;
  lastMessage?: ConversationMessage;
  unreadCount?: number;
};
