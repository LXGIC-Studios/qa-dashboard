"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import {
  getProject,
  getCurrentUser,
  addBug,
} from "@/lib/store";
import type { Project, Profile, BugType, Severity } from "@/lib/types";

const bugTypes: { value: BugType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "ui", label: "UI Issue" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const severities: { value: Severity; label: string; color: string; bg: string }[] = [
  { value: "critical", label: "Critical", color: "text-accent-pink", bg: "bg-accent-pink" },
  { value: "high", label: "High", color: "text-orange-400", bg: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400" },
  { value: "low", label: "Low", color: "text-accent", bg: "bg-accent" },
];

const devicePresets = [
  "Chrome (Desktop)",
  "Safari (Desktop)",
  "Firefox (Desktop)",
  "Edge (Desktop)",
  "Chrome (Android)",
  "Safari (iOS)",
  "iPhone 15",
  "iPhone 14",
  "Samsung Galaxy S24",
  "iPad Pro",
];

export default function SubmitIssuePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BugType>("bug");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [deviceBrowser, setDeviceBrowser] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [pageScreen, setPageScreen] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    async function load() {
      const [p, user] = await Promise.all([
        getProject(slug),
        getCurrentUser(),
      ]);
      setProject(p);
      setCurrentUser(user);
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || submitting) return;
    setSubmitting(true);

    await addBug({
      title,
      description,
      type,
      severity,
      status: "open",
      steps_to_reproduce: stepsToReproduce || undefined,
      expected_behavior: expectedBehavior || undefined,
      actual_behavior: actualBehavior || undefined,
      device_browser: deviceBrowser || undefined,
      screenshot_url: screenshotUrl || undefined,
      page_screen: pageScreen || undefined,
      reported_by: currentUser?.id,
      project_id: project.id,
    });

    router.push(`/project/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Project not found</p>
      </div>
    );
  }

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors min-h-[44px]";

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/project/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4 min-h-[44px] md:min-h-0"
        >
          <ArrowLeft size={14} />
          Back to {project.name}
        </Link>

        <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Submit Issue
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Report an issue for <span className="text-accent">{project.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Title & Type & Severity */}
        <div className="bg-card border border-card-border rounded-xl p-4 md:p-5 space-y-4 md:space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Title <span className="text-accent-pink">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Short, descriptive title for the issue"
              required
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Type <span className="text-accent-pink">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {bugTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all min-h-[40px] ${
                    type === t.value
                      ? "bg-accent text-black"
                      : "bg-surface border border-card-border text-muted hover:text-foreground hover:border-accent/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Selector */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Severity <span className="text-accent-pink">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {severities.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 min-h-[40px] ${
                    severity === s.value
                      ? `${s.bg} ${s.value === "low" ? "text-black" : "text-white"}`
                      : "bg-surface border border-card-border text-muted hover:text-foreground hover:border-accent/30"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${severity === s.value ? (s.value === "low" ? "bg-black/30" : "bg-white/30") : s.bg}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Description <span className="text-accent-pink">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Describe the issue in detail..."
              required
            />
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-card border border-card-border rounded-xl p-4 md:p-5 space-y-4 md:space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Details
          </h3>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Steps to Reproduce
            </label>
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder={"1. Go to...\n2. Click on...\n3. Observe..."}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected Behavior */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2">
                Expected Behavior
              </label>
              <textarea
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="What should happen..."
              />
            </div>

            {/* Actual Behavior */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2">
                Actual Behavior
              </label>
              <textarea
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="What actually happens..."
              />
            </div>
          </div>
        </div>

        {/* Environment & Context */}
        <div className="bg-card border border-card-border rounded-xl p-4 md:p-5 space-y-4 md:space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Environment & Context
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device / Browser */}
            <div className="relative">
              <label className="block text-xs font-medium text-muted mb-2">
                Device / Browser
              </label>
              <input
                type="text"
                value={deviceBrowser}
                onChange={(e) => setDeviceBrowser(e.target.value)}
                onFocus={() => setShowPresets(true)}
                onBlur={() => setTimeout(() => setShowPresets(false), 200)}
                className={inputClass}
                placeholder="e.g. Chrome on macOS"
              />
              {showPresets && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-card-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {devicePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDeviceBrowser(preset);
                        setShowPresets(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-muted hover:text-foreground hover:bg-surface transition-colors min-h-[44px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Page / Screen */}
            <div>
              <label className="block text-xs font-medium text-muted mb-2">
                Page / Screen
              </label>
              <input
                type="text"
                value={pageScreen}
                onChange={(e) => setPageScreen(e.target.value)}
                className={inputClass}
                placeholder="e.g. Login page, Dashboard"
              />
            </div>
          </div>

          {/* Screenshot URL */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Screenshot URL
            </label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Footer info + Submit */}
        <div className="bg-card border border-card-border rounded-xl p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Reported by:{" "}
                <span className="text-foreground">
                  {currentUser?.full_name || "Unknown"}
                </span>
              </p>
              <p>
                Project:{" "}
                <span className="text-accent">{project.name}</span>
              </p>
              <p>
                Status: <span className="text-accent-pink">Open</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[48px] w-full sm:w-auto"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit Issue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
