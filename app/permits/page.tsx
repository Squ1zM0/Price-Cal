"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";

type AdoptedCode = {
  code: string;
  name: string;
  edition: string;
  adoption_date: string;
  notes: string;
};

type StateAmendment = {
  section: string;
  title: string;
  amendment: string;
  impact: string;
};

type GeneralRequirement = {
  category: string;
  requirement: string;
  exemptions?: string[];
  typical_stages?: string[];
  notes?: string;
};

type BaselineData = {
  version: string;
  last_updated: string;
  state: string;
  description: string;
  adopted_codes: AdoptedCode[];
  statewide_amendments: StateAmendment[];
  general_requirements: GeneralRequirement[];
};

type PermitRequirement = {
  required: boolean;
  online_application: boolean;
  typical_fee_range: string;
  notes: string;
};

type LocalAmendment = {
  section: string;
  requirement: string;
  enforcement: string;
};

type JurisdictionContacts = {
  phone: string;
  website: string;
  permit_office: string;
};

type Jurisdiction = {
  id: string;
  name: string;
  type: string;
  region: string;
  population_tier: string;
  permit_requirements: {
    residential: PermitRequirement;
    commercial: PermitRequirement;
  };
  inspection_stages: string[];
  local_amendments: LocalAmendment[];
  common_callouts: string[];
  contacts: JurisdictionContacts;
};

type JurisdictionsData = {
  version: string;
  last_updated: string;
  jurisdictions: Jurisdiction[];
};

type CalloutItem = {
  violation: string;
  code_reference: string;
  common_cause: string;
  prevention: string;
  inspection_notes: string;
};

type CalloutCategory = {
  category: string;
  risk_level: string;
  items: CalloutItem[];
};

type CalloutsData = {
  version: string;
  last_updated: string;
  description: string;
  categories: CalloutCategory[];
  inspection_tips: string[];
};

type ViewMode = "lookup" | "baseline" | "callouts";

export default function PermitsPage() {
  const [view, setView] = useState<ViewMode>("lookup");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | null>(null);
  const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
  const [jurisdictionsData, setJurisdictionsData] = useState<JurisdictionsData | null>(null);
  const [calloutsData, setCalloutsData] = useState<CalloutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [baselineRes, jurisdictionsRes, calloutsRes] = await Promise.all([
          fetch("/permits-data/colorado-baseline.json", { cache: "no-store" }),
          fetch("/permits-data/jurisdictions.json", { cache: "no-store" }),
          fetch("/permits-data/common-callouts.json", { cache: "no-store" }),
        ]);

        if (!baselineRes.ok || !jurisdictionsRes.ok || !calloutsRes.ok) {
          throw new Error("Failed to load permits data");
        }

        const [baseline, jurisdictions, callouts] = await Promise.all([
          baselineRes.json() as Promise<BaselineData>,
          jurisdictionsRes.json() as Promise<JurisdictionsData>,
          calloutsRes.json() as Promise<CalloutsData>,
        ]);

        if (alive) {
          setBaselineData(baseline);
          setJurisdictionsData(jurisdictions);
          setCalloutsData(callouts);
          setLoading(false);
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message || "Failed to load data");
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filteredJurisdictions = useMemo(() => {
    if (!jurisdictionsData) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return jurisdictionsData.jurisdictions;

    return jurisdictionsData.jurisdictions.filter((j) => {
      const searchable = [
        j.name,
        j.type,
        j.region,
        ...j.common_callouts,
        j.contacts.permit_office,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [jurisdictionsData, searchQuery]);

  const handleJurisdictionClick = (jurisdiction: Jurisdiction) => {
    setSelectedJurisdiction(jurisdiction);
  };

  const handleBackToList = () => {
    setSelectedJurisdiction(null);
  };

  if (loading) {
    return (
      <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
          <AppHeader title="CO Permits & Code" subtitle="Colorado HVAC/Mechanical Reference" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-600 dark:text-slate-400">Loading permits data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
          <AppHeader title="CO Permits & Code" subtitle="Colorado HVAC/Mechanical Reference" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-rose-600 dark:text-rose-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
        <AppHeader title="CO Permits & Code" subtitle="Colorado HVAC/Mechanical Reference" />

        {/* View Selector */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 transition-all duration-300">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setView("lookup");
                setSelectedJurisdiction(null);
              }}
              className={
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 " +
                (view === "lookup"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
              }
            >
              Jurisdiction Lookup
            </button>
            <button
              type="button"
              onClick={() => {
                setView("baseline");
                setSelectedJurisdiction(null);
              }}
              className={
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 " +
                (view === "baseline"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
              }
            >
              State Code Baseline
            </button>
            <button
              type="button"
              onClick={() => {
                setView("callouts");
                setSelectedJurisdiction(null);
              }}
              className={
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 " +
                (view === "callouts"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
              }
            >
              Common Callouts
            </button>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="min-h-0 flex-1 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden transition-all duration-300">
          <div className="h-full overflow-auto">
            {view === "lookup" && !selectedJurisdiction && (
              <div className="p-4 sm:p-6">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by city, county, or region..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredJurisdictions.length} of {jurisdictionsData?.jurisdictions.length || 0} jurisdictions
                  </div>
                </div>

                {/* Jurisdiction List */}
                <div className="grid gap-3">
                  {filteredJurisdictions.map((jurisdiction) => (
                    <button
                      key={jurisdiction.id}
                      type="button"
                      onClick={() => handleJurisdictionClick(jurisdiction)}
                      className="text-left rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {jurisdiction.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {jurisdiction.type} • {jurisdiction.region}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5 text-slate-400"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === "lookup" && selectedJurisdiction && (
              <div className="p-4 sm:p-6">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Back to List
                </button>

                {/* Jurisdiction Detail */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedJurisdiction.name}
                    </h2>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {selectedJurisdiction.type} • {selectedJurisdiction.region}
                    </div>
                  </div>

                  {/* Permit Requirements */}
                  <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                      Permit Requirements
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Residential
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          <div>Required: {selectedJurisdiction.permit_requirements.residential.required ? "Yes" : "No"}</div>
                          <div>Online Application: {selectedJurisdiction.permit_requirements.residential.online_application ? "Yes" : "No"}</div>
                          <div>Fee Range: {selectedJurisdiction.permit_requirements.residential.typical_fee_range}</div>
                          <div className="mt-1 italic">{selectedJurisdiction.permit_requirements.residential.notes}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Commercial
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          <div>Required: {selectedJurisdiction.permit_requirements.commercial.required ? "Yes" : "No"}</div>
                          <div>Online Application: {selectedJurisdiction.permit_requirements.commercial.online_application ? "Yes" : "No"}</div>
                          <div>Fee Range: {selectedJurisdiction.permit_requirements.commercial.typical_fee_range}</div>
                          <div className="mt-1 italic">{selectedJurisdiction.permit_requirements.commercial.notes}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inspection Stages */}
                  <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                      Inspection Stages
                    </h3>
                    <ul className="space-y-1">
                      {selectedJurisdiction.inspection_stages.map((stage, idx) => (
                        <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                          • {stage}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Local Amendments */}
                  {selectedJurisdiction.local_amendments.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-4 ring-1 ring-inset ring-amber-200 dark:ring-amber-700">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                        Local Amendments (Differs from State)
                      </h3>
                      <div className="space-y-3">
                        {selectedJurisdiction.local_amendments.map((amendment, idx) => (
                          <div key={idx}>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {amendment.section}
                            </div>
                            <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                              {amendment.requirement}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                              Enforcement: {amendment.enforcement}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Callouts */}
                  {selectedJurisdiction.common_callouts.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                        Common Callouts
                      </h3>
                      <ul className="space-y-1">
                        {selectedJurisdiction.common_callouts.map((callout, idx) => (
                          <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                            • {callout}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 ring-1 ring-inset ring-blue-200 dark:ring-blue-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                      Contact Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span>{" "}
                        <a href={`tel:${selectedJurisdiction.contacts.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {selectedJurisdiction.contacts.phone}
                        </a>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Website:</span>{" "}
                        <a href={selectedJurisdiction.contacts.website} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                          {selectedJurisdiction.contacts.website}
                        </a>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Permit Office:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">{selectedJurisdiction.contacts.permit_office}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === "baseline" && baselineData && (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {baselineData.state} Code Baseline
                  </h2>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {baselineData.description}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    Last updated: {baselineData.last_updated}
                  </div>
                </div>

                {/* Adopted Codes */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    Adopted Codes
                  </h3>
                  <div className="space-y-3">
                    {baselineData.adopted_codes.map((code, idx) => (
                      <div key={idx}>
                        <div className="text-base font-semibold text-slate-900 dark:text-white">
                          {code.code} - {code.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Edition: {code.edition} (Adopted {code.adoption_date})
                        </div>
                        <div className="mt-0.5 text-sm italic text-slate-600 dark:text-slate-400">
                          {code.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statewide Amendments */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-4 ring-1 ring-inset ring-amber-200 dark:ring-amber-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    Statewide Amendments
                  </h3>
                  <div className="space-y-3">
                    {baselineData.statewide_amendments.map((amendment, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2">
                          <div className="text-base font-semibold text-slate-900 dark:text-white">
                            {amendment.section} - {amendment.title}
                          </div>
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded-full font-semibold " +
                              (amendment.impact === "high"
                                ? "bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300"
                                : "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300")
                            }
                          >
                            {amendment.impact}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                          {amendment.amendment}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Requirements */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    General Requirements
                  </h3>
                  <div className="space-y-4">
                    {baselineData.general_requirements.map((req, idx) => (
                      <div key={idx}>
                        <div className="text-base font-semibold text-slate-900 dark:text-white">
                          {req.category}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {req.requirement}
                        </div>
                        {req.exemptions && req.exemptions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Exemptions:
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {req.exemptions.map((exemption, eidx) => (
                                <li key={eidx} className="text-xs text-slate-600 dark:text-slate-400">
                                  • {exemption}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {req.typical_stages && req.typical_stages.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Typical Stages:
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {req.typical_stages.map((stage, sidx) => (
                                <li key={sidx} className="text-xs text-slate-600 dark:text-slate-400">
                                  • {stage}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {req.notes && (
                          <div className="mt-2 text-xs italic text-slate-600 dark:text-slate-400">
                            {req.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === "callouts" && calloutsData && (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Common Code Callouts
                  </h2>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {calloutsData.description}
                  </div>
                </div>

                {/* Categories */}
                {calloutsData.categories.map((category, idx) => (
                  <div
                    key={idx}
                    className={
                      "rounded-2xl p-4 ring-1 ring-inset " +
                      (category.risk_level === "high"
                        ? "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 ring-rose-200 dark:ring-rose-700"
                        : category.risk_level === "medium"
                        ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 ring-amber-200 dark:ring-amber-700"
                        : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 ring-slate-200 dark:ring-slate-600")
                    }
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {category.category}
                      </h3>
                      <span
                        className={
                          "text-xs px-2 py-0.5 rounded-full font-semibold uppercase " +
                          (category.risk_level === "high"
                            ? "bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300"
                            : category.risk_level === "medium"
                            ? "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300")
                        }
                      >
                        {category.risk_level} risk
                      </span>
                    </div>

                    <div className="space-y-3">
                      {category.items.map((item, iidx) => (
                        <div
                          key={iidx}
                          className="rounded-xl bg-white/50 dark:bg-slate-900/30 p-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600"
                        >
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.violation}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">Code:</span> {item.code_reference}
                          </div>
                          <div className="mt-2 text-xs">
                            <div className="text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">Common Cause:</span> {item.common_cause}
                            </div>
                            <div className="mt-1 text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">Prevention:</span> {item.prevention}
                            </div>
                            <div className="mt-1 text-slate-600 dark:text-slate-400 italic">
                              <span className="font-semibold">Inspection Notes:</span> {item.inspection_notes}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Inspection Tips */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 ring-1 ring-inset ring-blue-200 dark:ring-blue-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    General Inspection Tips
                  </h3>
                  <ul className="space-y-1">
                    {calloutsData.inspection_tips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Reference only. Not legal authority. Verify requirements with local jurisdiction. Last updated: {baselineData?.last_updated || jurisdictionsData?.last_updated || "N/A"}
        </footer>
      </div>
    </div>
  );
}
