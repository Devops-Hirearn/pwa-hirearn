"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormSectionCard, formFieldLabelClass, formInputClass, formTextareaClass } from "@/components/employer/FormSectionCard";
import { useAuth } from "@/contexts/auth-context";
import { createEmployerJob, getEmployerBillingConfig } from "@/lib/api/jobCreate";
import { placesAutocomplete, placeDetails, type PlacePrediction } from "@/lib/api/places";
import { uploadFileWithPresign } from "@/lib/uploads/presign";

/** Model requires category; not collected in UI — single default. */
const DEFAULT_JOB_CATEGORY = "General";

const FACILITY_TYPES = [
  { id: "food", label: "Food" },
  { id: "water", label: "Water" },
  { id: "accommodation", label: "Accommodation" },
  { id: "transport", label: "Transport" },
  { id: "tools", label: "Tools" },
  { id: "washroom", label: "Washroom" },
  { id: "other", label: "Other" },
] as const;

type FacilityId = (typeof FACILITY_TYPES)[number]["id"];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function PostJobForm() {
  const router = useRouter();
  const { user } = useAuth();

  /** Backend requires identityDocuments.verificationStatus === 'approved' for all job posts */
  const isKycApproved = useMemo(() => {
    if (!user) return false;
    return (
      (user.identityDocuments as { verificationStatus?: string } | undefined)?.verificationStatus ===
      "approved"
    );
  }, [user]);

  const [jobType, setJobType] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [locationText, setLocationText] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [placeQuery, setPlaceQuery] = useState("");
  const debouncedPlace = useDebounced(placeQuery, 320);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const [workersNeeded, setWorkersNeeded] = useState("1");
  const [dailySalary, setDailySalary] = useState("500");
  const [payoutMode, setPayoutMode] = useState<"DIGITAL" | "CASH">("DIGITAL");

  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [monthlyDisclaimer, setMonthlyDisclaimer] = useState(false);
  const [duration, setDuration] = useState<"FLEXIBLE" | "PERMANENT">("PERMANENT");
  const [pfApplicable, setPfApplicable] = useState(false);
  const [esicApplicable, setEsicApplicable] = useState(false);

  const [facilities, setFacilities] = useState<Record<FacilityId, boolean>>(
    () =>
      Object.fromEntries(FACILITY_TYPES.map((f) => [f.id, false])) as Record<FacilityId, boolean>,
  );

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [kycBlock, setKycBlock] = useState(false);
  /** Mirrors mobile PostJob: from GET /jobs/billing-config; null until first fetch completes. */
  const [showDigitalUpfrontTokenSplit, setShowDigitalUpfrontTokenSplit] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await getEmployerBillingConfig();
        if (cancelled) return;
        if (cfg?.showDigitalUpfrontTokenSplit !== undefined) {
          setShowDigitalUpfrontTokenSplit(Boolean(cfg.showDigitalUpfrontTokenSplit));
        } else {
          setShowDigitalUpfrontTokenSplit(true);
        }
      } catch {
        if (!cancelled) setShowDigitalUpfrontTokenSplit(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (debouncedPlace.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const r = await placesAutocomplete(debouncedPlace);
        if (!cancel) setSuggestions(r.predictions || []);
      } catch {
        if (!cancel) setSuggestions([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [debouncedPlace]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pickPlace = async (p: PlacePrediction) => {
    setShowSuggestions(false);
    setPlaceQuery(p.description);
    try {
      const r = await placeDetails(p.placeId);
      const pl = r.place;
      if (pl?.formattedAddress) setLocationText(pl.formattedAddress);
      if (pl?.city) setCity(pl.city);
      if (pl?.state) setState(pl.state);
      if (pl?.pincode) setPincode(pl.pincode.slice(0, 6));
      if (pl?.coordinates) {
        setCoords({ lat: pl.coordinates.latitude, lng: pl.coordinates.longitude });
      } else {
        setCoords(null);
      }
    } catch {
      setError("Could not load place details. Try another search result.");
    }
  };

  const toggleFacility = (id: FacilityId) => {
    setFacilities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const facilityPayload = useMemo(
    () =>
      FACILITY_TYPES.filter((f) => facilities[f.id]).map((f) => ({
        type: f.id,
        provided: true,
      })),
    [facilities],
  );

  const numberOfDays = useMemo(() => {
    if (jobType !== "DAILY") return 1;
    if (!isMultiDay) return 1;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
  }, [jobType, isMultiDay, startDate, endDate]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || Number.isNaN(value) || !Number.isFinite(value)) return "0";
    return value.toLocaleString("en-IN");
  };

  /** Same rules as mobile `PostJob.tsx` `amountBreakdown`. */
  const amountBreakdown = useMemo(() => {
    const workers = Number(workersNeeded || 1);
    const payPerWorker = Number(dailySalary || 0);
    const days = numberOfDays > 0 ? numberOfDays : 1;

    if (Number.isNaN(workers) || workers < 1) {
      return {
        grossJobAmount: 0,
        platformCommission: 0,
        netWorkerAmount: 0,
        tokenAmount: 0,
        remainingAmount: 0,
        grossDayAmount: 0,
        netDayAmount: 0,
        tokenPercentage: 0,
        isCashMode: payoutMode === "CASH",
        hideDigitalTokenSplit: false,
        isMonthly: false,
      };
    }
    if (Number.isNaN(payPerWorker) || payPerWorker <= 0) {
      return {
        grossJobAmount: 0,
        platformCommission: 0,
        netWorkerAmount: 0,
        tokenAmount: 0,
        remainingAmount: 0,
        grossDayAmount: 0,
        netDayAmount: 0,
        tokenPercentage: 0,
        isCashMode: payoutMode === "CASH",
        hideDigitalTokenSplit: false,
        isMonthly: false,
      };
    }

    const grossJobAmount = payPerWorker * days;
    const platformCommission = Math.round(grossJobAmount * 0.07);
    const netWorkerAmount = grossJobAmount - platformCommission;
    const grossDayAmount = days > 0 ? Math.round(grossJobAmount / days) : 0;
    const platformCommissionPerDay = Math.round(grossDayAmount * 0.07);
    const netDayAmount = grossDayAmount - platformCommissionPerDay;

    if (jobType === "MONTHLY") {
      return {
        grossJobAmount: payPerWorker,
        platformCommission: 0,
        netWorkerAmount: payPerWorker,
        tokenAmount: 0,
        remainingAmount: 0,
        grossDayAmount: 0,
        netDayAmount: 0,
        tokenPercentage: 0,
        isCashMode: true,
        hideDigitalTokenSplit: false,
        isMonthly: true,
      };
    }

    if (payoutMode === "CASH") {
      const cashTokenPercentage = 0.085;
      const cashTokenPerWorker = Math.round(grossJobAmount * cashTokenPercentage);
      const cashTokenTotal = cashTokenPerWorker * workers;
      return {
        grossJobAmount: grossJobAmount || 0,
        platformCommission: platformCommission || 0,
        netWorkerAmount: netWorkerAmount || 0,
        tokenAmount: cashTokenTotal || 0,
        remainingAmount: 0,
        grossDayAmount: grossDayAmount || 0,
        netDayAmount: netDayAmount || 0,
        tokenPercentage: cashTokenPercentage * 100,
        isCashMode: true,
        hideDigitalTokenSplit: false,
        isMonthly: false,
      };
    }

    if (showDigitalUpfrontTokenSplit === false) {
      return {
        grossJobAmount: grossJobAmount || 0,
        platformCommission: platformCommission || 0,
        netWorkerAmount: netWorkerAmount || 0,
        tokenAmount: 0,
        remainingAmount: 0,
        grossDayAmount: grossDayAmount || 0,
        netDayAmount: netDayAmount || 0,
        tokenPercentage: 0,
        isCashMode: false,
        hideDigitalTokenSplit: true,
        isMonthly: false,
      };
    }

    let tokenPercentage = 0.5;
    if (workers >= 6 && workers <= 15) tokenPercentage = 0.3;
    if (workers >= 16) tokenPercentage = 0.1;
    const tokenAmountPerWorker = Math.round(grossJobAmount * tokenPercentage);
    const remainingAmountPerWorker = grossJobAmount - tokenAmountPerWorker;

    return {
      grossJobAmount: grossJobAmount || 0,
      platformCommission: platformCommission || 0,
      netWorkerAmount: netWorkerAmount || 0,
      tokenAmount: (tokenAmountPerWorker * workers) || 0,
      remainingAmount: (remainingAmountPerWorker * workers) || 0,
      grossDayAmount: grossDayAmount || 0,
      netDayAmount: netDayAmount || 0,
      tokenPercentage: tokenPercentage * 100,
      isCashMode: false,
      hideDigitalTokenSplit: false,
      isMonthly: false,
    };
  }, [workersNeeded, dailySalary, numberOfDays, payoutMode, jobType, showDigitalUpfrontTokenSplit]);

  const digitalPayoutHint =
    showDigitalUpfrontTokenSplit === false
      ? "No upfront token split. You pay from the platform after workers check out, based on actual time worked (see job completion flow)."
      : "Platform fee (7%) will be deducted before worker payout.";

  const buildLocationPayload = () => {
    const base: Record<string, unknown> = {
      address: locationText.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };
    if (coords) {
      base.coordinates = {
        type: "Point",
        coordinates: [Number(coords.lng), Number(coords.lat)],
      };
    }
    return base;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isKycApproved) {
      setKycBlock(true);
      return;
    }

    const workers = Number(workersNeeded);
    if (!jobTitle.trim()) return setError("Job title is required");
    if (!jobDescription.trim()) return setError("Job description is required");
    if (!locationText.trim()) return setError("Address is required");
    if (!city.trim() || !state.trim() || pincode.length !== 6) {
      return setError("City, state, and 6-digit pincode are required");
    }
    if (Number.isNaN(workers) || workers < 1) return setError("Workers must be at least 1");

    const uploadedUrls: string[] = [];
    if (files.length > 0) {
      try {
        setSubmitting(true);
        for (const f of files.slice(0, 8)) {
          const u = await uploadFileWithPresign(f);
          uploadedUrls.push(u.publicUrl);
        }
      } catch (err) {
        setSubmitting(false);
        setError(err instanceof Error ? err.message : "Upload failed");
        return;
      }
    }

    try {
      setSubmitting(true);

      let payload: Record<string, unknown>;

      if (jobType === "MONTHLY") {
        const smin = Number(salaryMin);
        const smax = Number(salaryMax);
        if (!smin || smin <= 0) {
          setSubmitting(false);
          return setError("Valid minimum salary is required");
        }
        if (!smax || smax <= 0) {
          setSubmitting(false);
          return setError("Valid maximum salary is required");
        }
        if (smax < smin) {
          setSubmitting(false);
          return setError("Maximum salary must be ≥ minimum");
        }
        if (!monthlyDisclaimer) {
          setSubmitting(false);
          return setError("Accept the monthly job disclaimer");
        }
        payload = {
          jobType: "MONTHLY",
          title: jobTitle.trim(),
          description: jobDescription.trim(),
          category: DEFAULT_JOB_CATEGORY,
          location: buildLocationPayload(),
          workersNeeded: workers,
          monthlyDisclaimerAccepted: true,
          salaryMin: smin,
          salaryMax: smax,
          duration,
          pfApplicable,
          esicApplicable,
          facilities: facilityPayload,
          documentsRequired: uploadedUrls,
          date: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "18:00",
          paymentPerWorker: 0,
        };
      } else {
        if (isMultiDay) {
          if (!startDate || !endDate) {
            setSubmitting(false);
            return setError("Start and end dates required for multi-day jobs");
          }
          const s = new Date(startDate);
          const en = new Date(endDate);
          if (en <= s) {
            setSubmitting(false);
            return setError("End date must be after start date");
          }
        } else {
          if (!date) {
            setSubmitting(false);
            return setError("Job date is required");
          }
        }
        if (!startTime || !endTime) {
          setSubmitting(false);
          return setError("Start and end times are required");
        }
        const daily = Number(dailySalary);
        if (Number.isNaN(daily) || daily < 0) {
          setSubmitting(false);
          return setError("Daily wage must be valid");
        }
        const paymentPerWorker = daily * numberOfDays;
        const dateFields: Record<string, string> = isMultiDay
          ? { date: startDate, startDate, endDate }
          : { date };

        payload = {
          title: jobTitle.trim(),
          description: jobDescription.trim(),
          category: DEFAULT_JOB_CATEGORY,
          location: buildLocationPayload(),
          ...dateFields,
          startTime,
          endTime,
          workersNeeded: workers,
          paymentPerWorker,
          requirements: specialInstructions.trim() ? [specialInstructions.trim()] : [],
          facilities: facilityPayload,
          payoutMode,
          jobType: "DAILY",
          documentsRequired: uploadedUrls,
        };
      }

      const { id, message, kycRequired } = await createEmployerJob(payload);
      if (!id) {
        setError(message || "Could not create job");
        if (kycRequired) setKycBlock(true);
        return;
      }
      if (jobType === "DAILY" && payoutMode === "CASH") {
        router.push("/jobs/" + encodeURIComponent(id) + "/payment");
      } else {
        router.push("/jobs/" + encodeURIComponent(id));
      }
    } catch (err) {
      const anyErr = err as Error & { body?: Record<string, unknown> };
      const body = anyErr.body;
      if (body?.kycRequired === true) setKycBlock(true);
      const msg =
        typeof body?.message === "string"
          ? body.message
          : anyErr.message || "Failed to create job";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-10 sm:space-y-5">
      <FormSectionCard
        eyebrow="Step 1"
        title="Type of role"
        subtitle="Daily shifts use day rates and attendance. Monthly roles use a salary band."
      >
        <div className="flex rounded-2xl border border-slate-200/90 bg-slate-100/70 p-1 shadow-inner">
          <button
            type="button"
            className={
              "flex-1 rounded-xl py-3 text-sm font-bold transition " +
              (jobType === "DAILY"
                ? "bg-white text-[#2563EB] shadow-md shadow-blue-500/10"
                : "text-slate-600 hover:text-slate-800")
            }
            onClick={() => setJobType("DAILY")}
          >
            Daily wage
          </button>
          <button
            type="button"
            className={
              "flex-1 rounded-xl py-3 text-sm font-bold transition " +
              (jobType === "MONTHLY"
                ? "bg-white text-[#2563EB] shadow-md shadow-blue-500/10"
                : "text-slate-600 hover:text-slate-800")
            }
            onClick={() => setJobType("MONTHLY")}
          >
            Monthly
          </button>
        </div>
      </FormSectionCard>

      <FormSectionCard eyebrow="Basics" title="What workers should know" subtitle="Clear titles get faster applications.">
        <div>
          <label className={formFieldLabelClass}>Job title</label>
          <input
            className={formInputClass}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Warehouse loader — night shift"
            required
          />
        </div>
        <div>
          <label className={formFieldLabelClass}>Description</label>
          <textarea
            className={formTextareaClass}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Tasks, expectations, dress code, reporting person…"
            required
          />
        </div>
      </FormSectionCard>

      <FormSectionCard
        eyebrow="Location"
        title="Where the work happens"
        subtitle="Search first to pin the map. You can still edit the address."
      >
        <div>
          <label className={formFieldLabelClass}>Search (Google Places)</label>
          <div ref={suggestRef} className="relative mt-2">
            <input
              className={formInputClass + " !mt-0"}
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Start typing street or landmark…"
            />
            {showSuggestions && suggestions.length > 0 ? (
              <ul className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200/90 bg-white py-2 shadow-xl shadow-slate-900/10 ring-1 ring-black/[0.04]">
                {suggestions.map((p) => (
                  <li key={p.placeId}>
                    <button
                      type="button"
                      className="w-full px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                      onClick={() => pickPlace(p)}
                    >
                      <span className="font-semibold text-slate-900">{p.mainText}</span>
                      <span className="mt-0.5 block text-xs font-medium text-slate-500">{p.secondaryText}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">Pick a suggestion to fill city, pincode, and coordinates.</p>
        </div>
        <div>
          <label className={formFieldLabelClass}>Full address</label>
          <input
            className={formInputClass}
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={formFieldLabelClass}>Landmark (optional)</label>
          <input className={formInputClass} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={formFieldLabelClass}>City</label>
            <input className={formInputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div>
            <label className={formFieldLabelClass}>State</label>
            <input className={formInputClass} value={state} onChange={(e) => setState(e.target.value)} required />
          </div>
          <div>
            <label className={formFieldLabelClass}>Pincode</label>
            <input
              className={formInputClass}
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
        </div>
      </FormSectionCard>

      {jobType === "DAILY" ? (
        <FormSectionCard
          eyebrow="Schedule & pay"
          title="When and how much"
          subtitle="Total pay per worker is daily wage × number of days."
        >
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={isMultiDay}
              onChange={(e) => setIsMultiDay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-semibold text-slate-800">Multi-day job (date range)</span>
          </label>
          {!isMultiDay ? (
            <div>
              <label className={formFieldLabelClass}>Work date</label>
              <input className={formInputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClass}>Start date</label>
                <input
                  className={formInputClass}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={formFieldLabelClass}>End date</label>
                <input
                  className={formInputClass}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClass}>Shift start</label>
              <input
                className={formInputClass}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={formFieldLabelClass}>Shift end</label>
              <input className={formInputClass} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClass}>Workers needed</label>
              <input
                className={formInputClass}
                type="number"
                min={1}
                value={workersNeeded}
                onChange={(e) => setWorkersNeeded(e.target.value)}
              />
            </div>
            <div>
              <label className={formFieldLabelClass}>Daily wage (₹ / worker / day)</label>
              <input
                className={formInputClass}
                type="number"
                min={0}
                value={dailySalary}
                onChange={(e) => setDailySalary(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={formFieldLabelClass}>Payout mode</label>
            <div className="mt-2 space-y-2">
              {(
                [
                  ["DIGITAL", "Digital — recommended", digitalPayoutHint],
                  ["CASH", "Cash", "Platform token before posting; you pay workers in cash on site."],
                ] as const
              ).map(([v, titleOpt, hint]) => (
                <label
                  key={v}
                  className={
                    "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition " +
                    (payoutMode === v
                      ? "border-[#2563EB]/45 bg-blue-50/70 shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-slate-300")
                  }
                >
                  <input
                    type="radio"
                    name="payout"
                    checked={payoutMode === v}
                    onChange={() => setPayoutMode(v as "DIGITAL" | "CASH")}
                    className="mt-1 h-4 w-4 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{titleOpt}</span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-slate-600">
              {payoutMode === "CASH"
                ? "Token fee (8.5%) is a non-refundable platform fee. You pay workers the full net amount in cash."
                : showDigitalUpfrontTokenSplit === false
                  ? "No upfront token split. You pay from the platform after workers check out, based on actual time worked (see job completion flow)."
                  : "Platform fee (7%) will be deducted before worker payout."}
            </p>
            {Number(dailySalary) > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5">
                <p className="text-sm font-bold text-slate-900">Payment breakdown</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-slate-600">Total job cost (per worker)</span>
                    <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.grossJobAmount)}</span>
                  </div>
                  {isMultiDay && numberOfDays > 1 ? (
                    <>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Per day (gross, per worker)</span>
                        <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.grossDayAmount)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Per day (net to worker)</span>
                        <span className="font-semibold text-emerald-800">₹{formatCurrency(amountBreakdown.netDayAmount)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {numberOfDays} day{numberOfDays > 1 ? "s" : ""} × ₹{formatCurrency(amountBreakdown.grossDayAmount)} = ₹
                        {formatCurrency(amountBreakdown.grossJobAmount)} per worker
                      </p>
                    </>
                  ) : null}
                  <div className="my-2 border-t border-slate-200/90" />
                  {payoutMode === "CASH" ? (
                    <>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Token fee (8.5%, non-refundable)</span>
                        <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.tokenAmount)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        (₹
                        {formatCurrency(Math.round(amountBreakdown.tokenAmount / (Number(workersNeeded) || 1)))}) per worker ×{" "}
                        {workersNeeded} worker{Number(workersNeeded) !== 1 ? "s" : ""}
                      </p>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">You pay worker in cash (net, per worker)</span>
                        <span className="font-semibold text-emerald-800">₹{formatCurrency(amountBreakdown.netWorkerAmount)}</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-red-800">
                        You must pay ₹{formatCurrency(amountBreakdown.netWorkerAmount)} per worker in cash (total: ₹
                        {formatCurrency(amountBreakdown.netWorkerAmount * (Number(workersNeeded) || 1))} for {workersNeeded}{" "}
                        worker{Number(workersNeeded) !== 1 ? "s" : ""}). The platform does not handle this payment.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Platform commission (7%, per worker)</span>
                        <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.platformCommission)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Worker receives (net, per worker)</span>
                        <span className="font-semibold text-emerald-800">₹{formatCurrency(amountBreakdown.netWorkerAmount)}</span>
                      </div>
                      {amountBreakdown.hideDigitalTokenSplit ? (
                        <p className="mt-2 text-xs font-medium text-slate-600">
                          Upfront token and &quot;remaining&quot; split does not apply. Settlement uses checkout attendance;
                          amounts are shown when you complete the job.
                        </p>
                      ) : null}
                    </>
                  )}
                  {payoutMode === "DIGITAL" && !amountBreakdown.hideDigitalTokenSplit ? (
                    <>
                      <div className="my-2 border-t border-slate-200/90" />
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">
                          Token payment ({formatCurrency(amountBreakdown.tokenPercentage) || "0"}%)
                        </span>
                        <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.tokenAmount)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        (₹
                        {formatCurrency(Math.round(amountBreakdown.tokenAmount / (Number(workersNeeded) || 1)))}) per worker ×{" "}
                        {workersNeeded} worker{Number(workersNeeded) !== 1 ? "s" : ""}
                      </p>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-600">Remaining amount (total)</span>
                        <span className="font-semibold text-slate-900">₹{formatCurrency(amountBreakdown.remainingAmount)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        (₹
                        {formatCurrency(Math.round(amountBreakdown.remainingAmount / (Number(workersNeeded) || 1)))}) per worker ×{" "}
                        {workersNeeded} worker{Number(workersNeeded) !== 1 ? "s" : ""}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </FormSectionCard>
      ) : (
        <FormSectionCard
          eyebrow="Compensation"
          title="Monthly package"
          subtitle="Applicants see the salary range you publish."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClass}>Min salary (₹ / mo)</label>
              <input
                className={formInputClass}
                type="number"
                min={0}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
            </div>
            <div>
              <label className={formFieldLabelClass}>Max salary (₹ / mo)</label>
              <input
                className={formInputClass}
                type="number"
                min={0}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={formFieldLabelClass}>Duration</label>
            <select
              className={formInputClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value as "FLEXIBLE" | "PERMANENT")}
            >
              <option value="PERMANENT">Permanent</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={pfApplicable}
                onChange={(e) => setPfApplicable(e.target.checked)}
                className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-sm font-semibold text-slate-800">PF applicable</span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={esicApplicable}
                onChange={(e) => setEsicApplicable(e.target.checked)}
                className="h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-sm font-semibold text-slate-800">ESIC applicable</span>
            </label>
          </div>
          <div>
            <label className={formFieldLabelClass}>Workers needed</label>
            <input
              className={formInputClass}
              type="number"
              min={1}
              value={workersNeeded}
              onChange={(e) => setWorkersNeeded(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3">
            <input
              type="checkbox"
              checked={monthlyDisclaimer}
              onChange={(e) => setMonthlyDisclaimer(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm font-medium leading-relaxed text-slate-700">
              I understand monthly listings are contractual hires and I accept Hirearn&apos;s terms for monthly job
              postings.
            </span>
          </label>
        </FormSectionCard>
      )}

      <FormSectionCard
        eyebrow="Extras"
        title="Facilities, files & notes"
        subtitle="Optional — helps workers decide faster."
      >
        <div>
          <label className={formFieldLabelClass}>Facilities you provide</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {FACILITY_TYPES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFacility(f.id)}
                className={
                  "rounded-full border px-3 py-2 text-xs font-bold transition active:scale-[0.98] " +
                  (facilities[f.id]
                    ? "border-[#2563EB]/50 bg-blue-50 text-[#2563EB] shadow-sm shadow-blue-500/10"
                    : "border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-slate-300")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={formFieldLabelClass}>Attachments</label>
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-4 py-5">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="block w-full cursor-pointer text-sm font-medium text-slate-600 file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#2563EB] file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white file:shadow-md"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <p className="mt-2 text-xs font-medium text-slate-500">Images or PDF — up to 8 files after upload.</p>
          </div>
        </div>
        <div>
          <label className={formFieldLabelClass}>Special instructions</label>
          <textarea
            className={formTextareaClass + " min-h-[80px]"}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Parking, ID at gate, safety gear…"
          />
        </div>
      </FormSectionCard>

      {error ? (
        <div className="rounded-2xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {kycBlock ? (
        <div className="hirearn-card rounded-3xl border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-50/30 p-5">
          <p className="text-base font-bold text-amber-950">Verify your identity to post</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-amber-900/90">
            Complete KYC in Hirearn so we can keep the marketplace safe for workers and employers.
          </p>
          <Link
            href="/settings/kyc"
            className="mt-4 inline-flex items-center rounded-2xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-600/20"
          >
            Go to KYC settings →
          </Link>
        </div>
      ) : null}

      <button type="submit" disabled={submitting} className="hirearn-btn-primary w-full py-4 text-[15px] disabled:opacity-60">
        {submitting ? "Publishing…" : "Publish job"}
      </button>
    </form>
  );
}
