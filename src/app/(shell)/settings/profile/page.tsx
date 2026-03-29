"use client";

import Link from "next/link";
import { FormSectionCard, formFieldLabelClass, formInputClass } from "@/components/employer/FormSectionCard";
import { useAuth } from "@/contexts/auth-context";
import { placesAutocomplete, placeDetails, type PlacePrediction } from "@/lib/api/places";
import { fetchUserProfileRecord, updateEmployerProfile, uploadProfilePhotoFile } from "@/lib/api/user";
import { EMPLOYER_DESIGNATIONS, EMPLOYER_TYPES } from "@/lib/employer/constants";
import { getApiBaseUrl } from "@/lib/config";
import { getPresignedViewUrl } from "@/lib/uploads/presignView";
import { useCallback, useEffect, useRef, useState } from "react";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

async function resolveProfileImageUrl(raw: string | null | undefined): Promise<string | null> {
  if (!raw || typeof raw !== "string") return null;
  const u = raw.trim();
  if (!u) return null;
  if (u.includes(".s3.") && (u.startsWith("http://") || u.startsWith("https://"))) {
    try {
      return await getPresignedViewUrl(u);
    } catch {
      return u;
    }
  }
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = getApiBaseUrl().replace(/\/api$/, "");
  return base + (u.startsWith("/") ? u : "/" + u);
}

export default function EmployerProfileSettingsPage() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [alternateContact, setAlternateContact] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [employerType, setEmployerType] = useState("");

  const [locationText, setLocationText] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const debouncedPlace = useDebounced(placeQuery, 320);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");

  const load = useCallback(async () => {
    setError("");
    try {
      setLoading(true);
      const u = await fetchUserProfileRecord();
      setPhoneNumber(String(u.phoneNumber ?? u.phone ?? ""));
      setFullName(String(u.fullName ?? ""));
      setEmail(String(u.email ?? ""));
      setBusinessName(String(u.businessName ?? ""));
      setAlternateContact(String(u.alternateContact ?? ""));
      setGstNumber(String(u.gstNumber ?? ""));
      setDesignation(String(u.designation ?? ""));
      setEmployerType(String(u.employerType ?? ""));

      const loc = u.location as Record<string, unknown> | undefined;
      if (loc && typeof loc === "object") {
        if (typeof loc.address === "string") {
          setLocationText(loc.address);
          setPlaceQuery(loc.address);
        }
        if (typeof loc.city === "string") setCity(loc.city);
        if (typeof loc.state === "string") setState(loc.state);
        if (typeof loc.pincode === "string") setPincode(String(loc.pincode).replace(/\D/g, "").slice(0, 6));
        const crd = loc.coordinates as { coordinates?: unknown[] } | undefined;
        if (crd && Array.isArray(crd.coordinates) && crd.coordinates.length >= 2) {
          setCoords({
            lng: Number(crd.coordinates[0]),
            lat: Number(crd.coordinates[1]),
          });
        } else {
          setCoords(null);
        }
      } else {
        setLocationText(String(u.address ?? ""));
        setPlaceQuery(String(u.address ?? ""));
        setCity(String(u.city ?? ""));
      }

      const photo = (u.profilePhoto ?? u.avatarUrl) as string | undefined;
      const resolved = await resolveProfileImageUrl(photo ?? null);
      setAvatarSrc(resolved);

      const nm = String(u.fullName ?? u.name ?? "User");
      setInitials(
        nm
          .split(/\s+/)
          .map((x) => x[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "U",
      );
    } catch {
      setError("Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      setError("Could not load that place. Try another.");
    }
  };

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhotoBusy(true);
      await uploadProfilePhotoFile(file);
      await refreshUser();
      await load();
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!designation || !employerType) {
      setError("Account type and designation are required.");
      return;
    }
    if (!locationText.trim() || !city.trim()) {
      setError("Choose your location from search and ensure city is set.");
      return;
    }
    if (!coords) {
      setError("Select a full address from suggestions so we can save map coordinates.");
      return;
    }
    try {
      setSaving(true);
      await updateEmployerProfile({
        fullName: fullName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        businessName: businessName.trim() || undefined,
        alternateContact: alternateContact.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
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
      setSuccess("Profile saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[60vh] bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition active:scale-95"
            aria-label="Back to settings"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">Edit profile</h1>
            <p className="text-xs font-medium text-slate-500">Photo &amp; business details</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            {success ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </p>
            ) : null}

            <div className="hirearn-card flex flex-col items-center rounded-3xl p-8">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2563EB] to-blue-600 text-2xl font-bold text-white shadow-lg">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {photoBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                  </div>
                ) : null}
              </div>
              <label className="mt-4 cursor-pointer text-sm font-semibold text-[#2563EB]">
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
              </label>
              <p className="mt-2 text-center text-xs text-slate-500">
                Phone {phoneNumber ? <span className="font-mono">{phoneNumber}</span> : "—"} (sign-in number; not
                editable)
              </p>
            </div>

            <FormSectionCard title="Personal &amp; business">
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-name">
                  Full name
                </label>
                <input
                  id="pf-name"
                  className={formInputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-email">
                  Email
                </label>
                <input
                  id="pf-email"
                  type="email"
                  className={formInputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-biz">
                  Company / business name
                </label>
                <input
                  id="pf-biz"
                  className={formInputClass}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-alt">
                  Alternate contact (optional)
                </label>
                <input
                  id="pf-alt"
                  className={formInputClass}
                  inputMode="tel"
                  value={alternateContact}
                  onChange={(e) => setAlternateContact(e.target.value)}
                />
              </div>
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-gst">
                  GST number (optional)
                </label>
                <input
                  id="pf-gst"
                  className={formInputClass}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                />
              </div>
              <div>
                <label className={formFieldLabelClass} htmlFor="pf-type">
                  Account type
                </label>
                <select
                  id="pf-type"
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
                <label className={formFieldLabelClass} htmlFor="pf-des">
                  Your designation
                </label>
                <select
                  id="pf-des"
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

            <FormSectionCard title="Location" subtitle="Search to update your registered work address.">
              <div ref={suggestRef} className="relative">
                <label className={formFieldLabelClass} htmlFor="pf-place">
                  Search address
                </label>
                <input
                  id="pf-place"
                  className={formInputClass}
                  value={placeQuery}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="street-address"
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
                    {suggestions.map((s) => (
                      <li key={s.placeId}>
                        <button
                          type="button"
                          className="w-full px-4 py-3.5 text-left text-[15px] active:bg-slate-50"
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
                  Active: {locationText}
                  {city ? ` · ${city}` : ""}
                </p>
              ) : null}
            </FormSectionCard>

            <button type="submit" disabled={saving} className="hirearn-btn-primary min-h-[48px] w-full">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
