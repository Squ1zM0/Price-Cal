"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";

// Enhanced Type Definitions
type CodeSubsection = {
  number: string;
  title: string;
  base_text: string;
  colorado_amendment: string | null;
  applicability: string;
  enforcement_notes: string;
};

type CodeSection = {
  section: string;
  title: string;
  subsections: CodeSubsection[];
};

type PermitExemption = {
  description: string;
  code_reference: string;
};

type AltitudeImpact = {
  category: string;
  requirement: string;
  code_reference: string;
};

type BaselineData = {
  version: string;
  last_updated: string;
  state: string;
  description: string;
  adopted_codes: Array<{
    code: string;
    name: string;
    edition: string;
    adoption_date: string;
    notes: string;
  }>;
  code_sections: CodeSection[];
  permit_requirements: {
    when_required: string;
    exemptions: PermitExemption[];
    inspection_requirements: {
      rough_in: string;
      final: string;
    };
  };
  altitude_adjustments: {
    general: string;
    key_impacts: AltitudeImpact[];
  };
};

type CodeAmendment = {
  section: string;
  title: string;
  base_requirement: string;
  denver_requirement: string;
  rationale: string;
  enforcement_level: string;
  code_text: string;
};

type EnforcementNote = {
  topic: string;
  requirement: string;
  common_failure: string;
};

type InspectionStage = {
  stage: string;
  when: string;
  inspector_focus: string;
};

type Jurisdiction = {
  id: string;
  name: string;
  type: string;
  region: string;
  elevation?: string;
  permit_requirements: {
    residential: {
      required: boolean;
      online_application: boolean;
      typical_fee_range: string;
      notes: string;
      processing_time?: string;
    };
    commercial: {
      required: boolean;
      online_application: boolean;
      typical_fee_range: string;
      notes: string;
      processing_time?: string;
    };
  };
  inspection_stages: InspectionStage[] | string[];
  code_amendments?: CodeAmendment[];
  enforcement_notes?: EnforcementNote[];
  local_amendments?: Array<{
    section: string;
    requirement: string;
    enforcement: string;
  }>;
  common_callouts?: string[];
  contacts: {
    phone: string;
    email?: string;
    website: string;
    permit_office: string;
    hours?: string;
  };
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

type ViewMode = "search" | "baseline" | "jurisdiction" | "callouts";

export default function PermitsPage() {
  const [view, setView] = useState<ViewMode>("search");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | null>(null);
  const [selectedCodeSection, setSelectedCodeSection] = useState<CodeSection | null>(null);
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

  // Global search across all content
  const searchResults = useMemo(() => {
    if (!globalSearch.trim() || !baselineData || !jurisdictionsData || !calloutsData) {
      return { code_sections: [], jurisdictions: [], callouts: [] };
    }

    const query = globalSearch.toLowerCase();
    const results: {
      code_sections: Array<{ section: CodeSection; subsection: CodeSubsection }>;
      jurisdictions: Array<{ jurisdiction: Jurisdiction; match_type: string }>;
      callouts: Array<{ category: CalloutCategory; item: CalloutItem }>;
    } = { code_sections: [], jurisdictions: [], callouts: [] };

    // Search code sections
    baselineData.code_sections.forEach((section) => {
      section.subsections.forEach((subsection) => {
        const searchable = [
          section.section,
          section.title,
          subsection.number,
          subsection.title,
          subsection.base_text,
          subsection.colorado_amendment || "",
          subsection.applicability,
          subsection.enforcement_notes,
        ]
          .join(" ")
          .toLowerCase();

        if (searchable.includes(query)) {
          results.code_sections.push({ section, subsection });
        }
      });
    });

    // Search jurisdictions
    jurisdictionsData.jurisdictions.forEach((jurisdiction) => {
      let match_type = "";
      const searchable = [
        jurisdiction.name,
        jurisdiction.region,
        jurisdiction.type,
        ...(jurisdiction.code_amendments?.map((a) => a.section + " " + a.title + " " + a.code_text) || []),
        ...(jurisdiction.enforcement_notes?.map((n) => n.topic + " " + n.requirement) || []),
      ]
        .join(" ")
        .toLowerCase();

      if (searchable.includes(query)) {
        if (jurisdiction.name.toLowerCase().includes(query)) match_type = "name";
        else if (jurisdiction.code_amendments?.some((a) => a.section.toLowerCase().includes(query)))
          match_type = "code_amendment";
        else match_type = "enforcement";

        results.jurisdictions.push({ jurisdiction, match_type });
      }
    });

    // Search callouts
    calloutsData.categories.forEach((category) => {
      category.items.forEach((item) => {
        const searchable = [
          category.category,
          item.violation,
          item.code_reference,
          item.common_cause,
          item.prevention,
          item.inspection_notes,
        ]
          .join(" ")
          .toLowerCase();

        if (searchable.includes(query)) {
          results.callouts.push({ category, item });
        }
      });
    });

    return results;
  }, [globalSearch, baselineData, jurisdictionsData, calloutsData]);

  if (loading) {
    return (
      <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <div className="mx-auto h-full w-full max-w-6xl flex flex-col gap-3">
          <AppHeader title="CO Code Reference" subtitle="Colorado HVAC/Mechanical Code Lookup" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-600 dark:text-slate-400">Loading code reference data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <div className="mx-auto h-full w-full max-w-6xl flex flex-col gap-3">
          <AppHeader title="CO Code Reference" subtitle="Colorado HVAC/Mechanical Code Lookup" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-rose-600 dark:text-rose-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="mx-auto h-full w-full max-w-6xl flex flex-col gap-3">
        <AppHeader title="CO Code Reference" subtitle="Colorado HVAC/Mechanical Code Lookup" />

        {/* Global Search */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 transition-all duration-300">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                if (e.target.value.trim()) {
                  setView("search");
                }
              }}
              placeholder="Search code sections, jurisdictions, requirements..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setView("baseline");
                  setGlobalSearch("");
                  setSelectedJurisdiction(null);
                  setSelectedCodeSection(null);
                }}
                className={
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300 " +
                  (view === "baseline"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
                }
              >
                State Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("jurisdiction");
                  setGlobalSearch("");
                  setSelectedCodeSection(null);
                }}
                className={
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300 " +
                  (view === "jurisdiction"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
                }
              >
                Jurisdictions
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("callouts");
                  setGlobalSearch("");
                  setSelectedJurisdiction(null);
                  setSelectedCodeSection(null);
                }}
                className={
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300 " +
                  (view === "callouts"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 hover:shadow-md")
                }
              >
                Common Violations
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="min-h-0 flex-1 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden transition-all duration-300">
          <div className="h-full overflow-auto">
            {/* Search Results View */}
            {view === "search" && globalSearch.trim() && (
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Search Results</h2>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {searchResults.code_sections.length + searchResults.jurisdictions.length + searchResults.callouts.length} results
                  </div>
                </div>

                {/* Code Section Results */}
                {searchResults.code_sections.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Code Sections</h3>
                    {searchResults.code_sections.map((result, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 ring-1 ring-inset ring-blue-200 dark:ring-blue-700 space-y-2"
                      >
                        <div className="text-sm font-bold text-blue-900 dark:text-blue-300">
                          {result.section.section} - {result.section.title}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {result.subsection.number} {result.subsection.title}
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{result.subsection.base_text}</div>
                        {result.subsection.colorado_amendment && (
                          <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-3 ring-1 ring-amber-300 dark:ring-amber-700">
                            <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                              Colorado Amendment
                            </div>
                            <div className="text-sm text-amber-900 dark:text-amber-200">{result.subsection.colorado_amendment}</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCodeSection(result.section);
                            setView("baseline");
                            setGlobalSearch("");
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View full section →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Jurisdiction Results */}
                {searchResults.jurisdictions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jurisdictions</h3>
                    {searchResults.jurisdictions.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedJurisdiction(result.jurisdiction);
                          setView("jurisdiction");
                          setGlobalSearch("");
                        }}
                        className="w-full text-left rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">{result.jurisdiction.name}</div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {result.jurisdiction.type} • {result.jurisdiction.region}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                              Match: {result.match_type}
                            </div>
                          </div>
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
                      </button>
                    ))}
                  </div>
                )}

                {/* Callout Results */}
                {searchResults.callouts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Common Violations</h3>
                    {searchResults.callouts.map((result, idx) => (
                      <div
                        key={idx}
                        className={
                          "rounded-2xl p-4 ring-1 ring-inset space-y-2 " +
                          (result.category.risk_level === "high"
                            ? "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 ring-rose-200 dark:ring-rose-700"
                            : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 ring-amber-200 dark:ring-amber-700")
                        }
                      >
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                          {result.category.category} • {result.category.risk_level} risk
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{result.item.violation}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Code: {result.item.code_reference}</div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.code_sections.length === 0 &&
                  searchResults.jurisdictions.length === 0 &&
                  searchResults.callouts.length === 0 && (
                    <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                      No results found for "{globalSearch}"
                    </div>
                  )}
              </div>
            )}

            {/* State Code Baseline View - Enhanced with actual code content */}
            {view === "baseline" && baselineData && (
              <StateCodeBaselineView
                baselineData={baselineData}
                selectedSection={selectedCodeSection}
                onSelectSection={(section) => setSelectedCodeSection(section)}
                onBack={() => setSelectedCodeSection(null)}
              />
            )}

            {/* Jurisdiction View */}
            {view === "jurisdiction" && jurisdictionsData && (
              <JurisdictionView
                jurisdictions={jurisdictionsData.jurisdictions}
                selectedJurisdiction={selectedJurisdiction}
                onSelectJurisdiction={(j) => setSelectedJurisdiction(j)}
                onBack={() => setSelectedJurisdiction(null)}
              />
            )}

            {/* Callouts View */}
            {view === "callouts" && calloutsData && <CalloutsView calloutsData={calloutsData} />}
          </div>
        </section>

        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Reference only. Not legal authority. Verify with local jurisdiction. Last updated: {baselineData?.last_updated}
        </footer>
      </div>
    </div>
  );
}

// State Code Baseline Component
function StateCodeBaselineView({
  baselineData,
  selectedSection,
  onSelectSection,
  onBack,
}: {
  baselineData: BaselineData;
  selectedSection: CodeSection | null;
  onSelectSection: (section: CodeSection) => void;
  onBack: () => void;
}) {
  if (selectedSection) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300"
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
          Back to Code Sections
        </button>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {selectedSection.section} - {selectedSection.title}
          </h2>
        </div>

        <div className="space-y-4">
          {selectedSection.subsections.map((subsection, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 space-y-3"
            >
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {subsection.number} {subsection.title}
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-900/30 p-3 ring-1 ring-slate-200 dark:ring-slate-600">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Base Code Text</div>
                <div className="text-sm text-slate-900 dark:text-white leading-relaxed">{subsection.base_text}</div>
              </div>

              {subsection.colorado_amendment && (
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-3 ring-1 ring-amber-300 dark:ring-amber-700">
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-2">
                    ⚠️ Colorado Amendment
                  </div>
                  <div className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    {subsection.colorado_amendment}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Applicability</div>
                  <div className="text-slate-600 dark:text-slate-400">{subsection.applicability}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Enforcement Notes</div>
                  <div className="text-slate-600 dark:text-slate-400">{subsection.enforcement_notes}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Colorado State Code Baseline</h2>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{baselineData.description}</div>
      </div>

      {/* Adopted Codes */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Adopted Codes</h3>
        <div className="space-y-2">
          {baselineData.adopted_codes.map((code, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">
                {code.code} {code.edition}
              </span>{" "}
              - {code.name}
              <div className="text-xs text-slate-600 dark:text-slate-400 italic mt-0.5">{code.notes}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Sections - Clickable */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Browse Code Sections</h3>
        {baselineData.code_sections.map((section, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSection(section)}
            className="w-full text-left rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 ring-1 ring-inset ring-blue-200 dark:ring-blue-700 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {section.section} - {section.title}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {section.subsections.length} subsection{section.subsections.length !== 1 ? "s" : ""}
                  {section.subsections.some((s) => s.colorado_amendment) && (
                    <span className="ml-2 text-xs bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      CO Amendments
                    </span>
                  )}
                </div>
              </div>
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
          </button>
        ))}
      </div>

      {/* Altitude Adjustments */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-4 ring-1 ring-inset ring-amber-200 dark:ring-amber-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Altitude Adjustments</h3>
        <div className="text-sm text-slate-700 dark:text-slate-300 mb-3">{baselineData.altitude_adjustments.general}</div>
        <div className="space-y-3">
          {baselineData.altitude_adjustments.key_impacts.map((impact, idx) => (
            <div key={idx} className="rounded-xl bg-white/50 dark:bg-slate-900/30 p-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{impact.category}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{impact.requirement}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ref: {impact.code_reference}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Jurisdiction View Component
function JurisdictionView({
  jurisdictions,
  selectedJurisdiction,
  onSelectJurisdiction,
  onBack,
}: {
  jurisdictions: Jurisdiction[];
  selectedJurisdiction: Jurisdiction | null;
  onSelectJurisdiction: (j: Jurisdiction) => void;
  onBack: () => void;
}) {
  if (selectedJurisdiction) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300"
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
          Back to Jurisdictions
        </button>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedJurisdiction.name}</h2>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {selectedJurisdiction.type} • {selectedJurisdiction.region}
            {selectedJurisdiction.elevation && <span> • Elevation: {selectedJurisdiction.elevation}</span>}
          </div>
        </div>

        {/* Code Amendments */}
        {selectedJurisdiction.code_amendments && selectedJurisdiction.code_amendments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Local Code Amendments</h3>
            {selectedJurisdiction.code_amendments.map((amendment, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-4 ring-1 ring-inset ring-amber-200 dark:ring-amber-700 space-y-2"
              >
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {amendment.section} - {amendment.title}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Code</div>
                    <div className="text-slate-600 dark:text-slate-400">{amendment.base_requirement}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">Local Requirement</div>
                    <div className="text-amber-900 dark:text-amber-200 font-semibold">{amendment.denver_requirement}</div>
                  </div>
                </div>

                <div className="rounded-xl bg-white/50 dark:bg-slate-900/30 p-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Code Text</div>
                  <div className="text-sm text-slate-900 dark:text-white leading-relaxed">{amendment.code_text}</div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Rationale:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{amendment.rationale}</span>
                  </div>
                  <div
                    className={
                      "px-2 py-0.5 rounded-full font-semibold " +
                      (amendment.enforcement_level.toLowerCase().includes("strict")
                        ? "bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300"
                        : "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300")
                    }
                  >
                    {amendment.enforcement_level}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enforcement Notes */}
        {selectedJurisdiction.enforcement_notes && selectedJurisdiction.enforcement_notes.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 ring-1 ring-inset ring-blue-200 dark:ring-blue-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Enforcement Notes</h3>
            <div className="space-y-3">
              {selectedJurisdiction.enforcement_notes.map((note, idx) => (
                <div key={idx} className="rounded-xl bg-white/50 dark:bg-slate-900/30 p-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{note.topic}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{note.requirement}</div>
                  <div className="text-xs text-rose-700 dark:text-rose-400 mt-2">
                    <span className="font-semibold">Common Failure:</span> {note.common_failure}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span>{" "}
              <a
                href={`tel:${selectedJurisdiction.contacts.phone}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedJurisdiction.contacts.phone}
              </a>
            </div>
            {selectedJurisdiction.contacts.email && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span>{" "}
                <a
                  href={`mailto:${selectedJurisdiction.contacts.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedJurisdiction.contacts.email}
                </a>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Website:</span>{" "}
              <a
                href={selectedJurisdiction.contacts.website}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {selectedJurisdiction.contacts.website}
              </a>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Office:</span>{" "}
              <span className="text-slate-600 dark:text-slate-400">{selectedJurisdiction.contacts.permit_office}</span>
            </div>
            {selectedJurisdiction.contacts.hours && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Hours:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{selectedJurisdiction.contacts.hours}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Colorado Jurisdictions</h2>
      <div className="grid gap-3">
        {jurisdictions.map((jurisdiction) => (
          <button
            key={jurisdiction.id}
            type="button"
            onClick={() => onSelectJurisdiction(jurisdiction)}
            className="text-left rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{jurisdiction.name}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {jurisdiction.type} • {jurisdiction.region}
                </div>
                {jurisdiction.code_amendments && jurisdiction.code_amendments.length > 0 && (
                  <div className="mt-2 text-xs bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 px-2 py-1 rounded-full inline-block">
                    {jurisdiction.code_amendments.length} local amendment
                    {jurisdiction.code_amendments.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
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
          </button>
        ))}
      </div>
    </div>
  );
}

// Callouts View Component (simplified version from previous)
function CalloutsView({ calloutsData }: { calloutsData: CalloutsData }) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Common Code Violations</h2>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{calloutsData.description}</div>
      </div>

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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{category.category}</h3>
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
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.violation}</div>
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
    </div>
  );
}
