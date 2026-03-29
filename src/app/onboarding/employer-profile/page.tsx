"use client";

import { FormSectionCard, formFieldLabelClass, formInputClass } from "@/components/employer/FormSectionCard";
import { useAuth } from "@/contexts/auth-context";
import { getEmployerOnboardingPath } from "@/lib/auth/employerGating";
import { placesAutocomplete, placeDetails, type PlacePrediction } from "@/lib/api/places";
import { updateEmployerProfile } from "@/lib/api/user";
import { EMPLOYER_DESIGNATIONS, EMPLOYER_TYPES } from "@/lib/employer/constants";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function EmployerOnboardingProfilePage() {
  const router = useRouter();
  const { user, ready, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [designation, setDesignation] = useState("");
  const [employerType, setEmployerType] = useState("");
  const [locationText, setLocationText] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [placeQuery, setPlaceQuery] = useState("");
  const debouncedPlace = useDebounced(placeQuery, 320);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const didPrefill = useRef(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
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
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isAdmin) {
      router.replace("/home");
      return;
    }
    if (user.role !== "employer") {
      router.replace("/login");
      return;
    }
    const next = getEmployerOnboardingPath(user);
    if (next === null) {
      router.replace("/home");
      return;
    }
    if (next !== "/onboarding/employer-profile") {
      router.replace(next);
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || didPrefill.current) return;
    if (user.fullName) setFullName(String(user.fullName));
    if (user.businessName) setBusinessName(String(user.businessName));
    if (user.designation) setDesignation(String(user.designation));
    if (user.employerType) setEmployerType(String(user.employerType));
    const loc = user.location as Record<string, unknown> | undefined;
    if (loc && typeof loc === "object") {
      if (typeof loc.address === "string") {
        setLocationText(loc.address);
        setPlaceQuery(loc.address);
      }
      if (typeof loc.city === "string") setCity(loc.city);
      if (typeof loc.state === "string") setState(loc.state);
      if (typeof loc.pincode === "string") setPincode(String(loc.pincode).slice(0, 6));
      const crd = loc.coordinates as { coordinates?: number[] } | undefined;
      if (crd && Array.isArray(crd.coordinates) && crd.coordinates.length >= 2) {
        setCoords({ lng: Number(crd.coordinates[0]), lat: Number(crd.coordinates[1]) });
      }
    } else if (user.city) {
      setCity(String(user.city));
    }
    didPrefill.current = true;
  }, [user]);

  const pickPlace = async (p: PlacePrediction) => {
    setShowSuggestions(false);
    setPlaceQuery(p.description);
    try {
      const r = await placeDetails(p.placeId);
      const pl = r.place;
      if (pl?.formattedAddress) setLocationText(pl.formattedAddress);
      if (pl?.city) setCity(pl.city);
      if (pl?.state) setState(pl.state);
      if (pl?.pincode) setPincode(pl.pincode.replace(/\D/g, "").slice(0, 6));
      if (pl?.coordinates) {
        setCoords({ lat: pl.coordinates.latitude, lng: pl.coordinates.longitude });
      } else {
        setCoords(null);
      }
    } catch {
      setError("Could not load that place. Try another search result.");
    }
  };

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (!fullName.trim() || !businessName.trim() || !designation || !employerType) {
        setError("Please fill all required fields.");
        return;
      }
      if (!locationText.trim()) {
        setError("Choose your work location from search.");
        return;
      }
      if (!city.trim()) {
        setError("City is required — pick a complete address from suggestions.");
        return;
      }
      if (!coords) {
        setError("Select a location that includes a pin on the map (choose a search result).");
        return;
      }

      try {
        setSubmitting(true);
        await updateEmployerProfile({
          fullName: fullName.trim(),
          businessName: businessName.trim(),
          designation,
          employerType,
          role: "employer",
          address: locationText.trim(),
          city: city.trim(),
          location: {
            address: locationText.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            coordinates: {
              type: "Point",
              coordinates: [coords.lng, coords.lat],
            },
          },
        });
        await refreshUser();
        router.replace("/onboarding/kyc");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save profile");
      } finally {
        setSubmitting(false);
      }
    },
    [
      fullName,
      businessName,
      designation,
      employerType,
      locationText,
      city,
      state,
      pincode,
      coords,
      refreshUser,
      router,
    ],
  );

  if (!ready || !user || user.role !== "employer") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <main className="pb-8">
      <h1 className="text-center text-xl font-bold tracking-tight text-slate-900">Your business profile</h1>
      <p className="mt-2 text-center text-[15px] leading-relaxed text-slate-600">
        Same details as the Hirearn app — we need this before you can hire and verify your identity.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <FormSectionCard title="Employer details" subtitle="Information shown to workers for trust and compliance.">
          <div>
            <label className={formFieldLabelClass} htmlFor="eo-fullName">
              Full name
            </label>
            <input
              id="eo-fullName"
              className={formInputClass}
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className={formFieldLabelClass} htmlFor="eo-business">
              Company / business name
            </label>
            <input
              id="eo-business"
              className={formInputClass}
              autoComplete="organization"
              enterKeyHint="next"
              placeholder="Registered or trading name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div>
            <label className={formFieldLabelClass} htmlFor="eo-type">
              Account type
            </label>
            <select
              id="eo-type"
              className={formInputClass}
              value={employerType}
              onChange={(e) => setEmployerType(e.target.value)}
            >
              <option value="">Select…</option>
              {EMPLOYER_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formFieldLabelClass} htmlFor="eo-desig">
              Your designation
            </label>
            <select
              id="eo-desig"
              className={formInputClass}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            >
              <option value="">Select…</option>
              {EMPLOYER_DESIGNATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </FormSectionCard>

        <FormSectionCard title="Location" subtitle="Search your office or primary work area — required for job posts.">
          <div ref={suggestRef} className="relative">
            <label className={formFieldLabelClass} htmlFor="eo-place">
              Search address
            </label>
            <input
              id="eo-place"
              className={formInputClass}
              autoComplete="street-address"
              enterKeyHint="search"
              placeholder="Area, street, or city"
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 ? (
              <ul
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
                role="listbox"
              >
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      className="w-full px-4 py-3.5 text-left text-[15px] text-slate-900 active:bg-slate-50"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => void pickPlace(s)}
                    >
                      <span className="font-medium">{s.mainText}</span>
                      {s.secondaryText ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{s.secondaryText}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {locationText ? (
            <p className="text-xs font-medium text-slate-600">
              Selected: <span className="text-slate-900">{locationText}</span>
              {city ? ` · ${city}` : ""}
            </p>
          ) : null}
        </FormSectionCard>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="hirearn-btn-primary w-full min-h-[48px]">
          {submitting ? "Saving…" : "Continue to identity verification"}
        </button>
      </form>
    </main>
  );
}
