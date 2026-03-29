"use client";

import { FormSectionCard, formFieldLabelClass } from "@/components/employer/FormSectionCard";
import { useAuth } from "@/contexts/auth-context";
import { submitEmployerIdentityViaPresign } from "@/lib/api/user";
import { useCallback, useMemo, useState } from "react";

const pickBtnClass =
  "flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 text-center text-[15px] font-semibold text-slate-700 transition active:scale-[0.99] active:bg-slate-50";

function FileSlot({
  id,
  label,
  hint,
  file,
  onPick,
  selfieCamera,
}: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
  /** Only the selfie uses `capture="user"` so phones open the front camera; documents use the picker only. */
  selfieCamera?: boolean;
}) {
  const captureProp = selfieCamera ? ({ capture: "user" as const } as const) : {};

  return (
    <div>
      <p id={id + "-legend"} className={formFieldLabelClass}>
        {label}
      </p>
      {/*
        iOS Safari: a clipped/hidden file input often only shows the photo library.
        Stack an opaque-but-transparent input over the button so taps hit the input directly.
      */}
      <div className="relative min-h-[48px]">
        <input
          id={id}
          type="file"
          accept="image/*"
          multiple={false}
          aria-labelledby={id + "-legend"}
          className={
            "absolute inset-0 z-[2] h-full min-h-[48px] w-full cursor-pointer opacity-0 " +
            "file:h-full file:min-h-[48px] file:w-full file:cursor-pointer"
          }
          {...captureProp}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <div
          className={pickBtnClass + " pointer-events-none relative z-[1] select-none"}
          aria-hidden
        >
          {file ? (
            <span className="truncate">{file.name}</span>
          ) : (
            <span className="text-slate-500">
              {selfieCamera ? (
                <>
                  <span className="font-semibold text-slate-800">Open camera</span>
                  <span> · Front-facing selfie</span>
                </>
              ) : (
                <>
                  Choose from photos · <span className="text-slate-800">{hint}</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmployerKycForm({ onComplete }: { onComplete?: () => void }) {
  const { refreshUser, user } = useAuth();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [pan, setPan] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const status = useMemo(() => {
    const v = user?.identityDocuments?.verificationStatus;
    if (v === "approved") return "approved" as const;
    if (v === "rejected") return "rejected" as const;
    if (v === "pending") return "pending" as const;
    return "none" as const;
  }, [user?.identityDocuments?.verificationStatus]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setOk("");
      if (!front || !back || !pan || !selfie) {
        setError("Please add all four: Aadhaar front & back, PAN card, and selfie.");
        return;
      }
      try {
        setBusy(true);
        await submitEmployerIdentityViaPresign({
          aadhaarFront: front,
          aadhaarBack: back,
          panCard: pan,
          selfie,
        });
        await refreshUser();
        setOk("Documents submitted. We’ll verify as soon as possible.");
        setFront(null);
        setBack(null);
        setPan(null);
        setSelfie(null);
        onComplete?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [front, back, pan, selfie, refreshUser, onComplete],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {status === "approved" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Your identity is verified. You can post jobs and use the full employer experience.
        </p>
      ) : null}
      {status === "pending" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          Verification is in progress. You can still explore the app; posting may require approval.
        </p>
      ) : null}
      {status === "rejected" ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          Previous submission was not accepted. Please upload clear images again.
        </p>
      ) : null}

      <FormSectionCard
        title="Identity documents"
        subtitle="Same as the Hirearn app for employers: Aadhaar front & back, PAN card, and selfie. Files upload securely to cloud storage (presigned S3). Max ~5 MB each unless your server allows more."
      >
        <FileSlot id="kyc-front" label="Aadhaar — front" hint="Front card" file={front} onPick={setFront} />
        <FileSlot id="kyc-back" label="Aadhaar — back" hint="Back card" file={back} onPick={setBack} />
        <FileSlot id="kyc-pan" label="PAN card" hint="Clear photo of PAN" file={pan} onPick={setPan} />
        <FileSlot
          id="kyc-selfie"
          label="Selfie"
          hint="Your face"
          file={selfie}
          selfieCamera
          onPick={setSelfie}
        />
      </FormSectionCard>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{ok}</p>
      ) : null}

      {status !== "approved" ? (
        <button type="submit" disabled={busy} className="hirearn-btn-primary w-full min-h-[48px]">
          {busy ? "Uploading…" : "Submit for verification"}
        </button>
      ) : null}
    </form>
  );
}
