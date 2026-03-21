"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, ImagePlus } from "lucide-react";
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
];

const severities: { value: Severity; label: string; bg: string; activeBg: string }[] = [
  { value: "critical", label: "Critical", bg: "bg-red-500/20 text-red-400 border-red-500/30", activeBg: "bg-red-500 text-white" },
  { value: "high", label: "High", bg: "bg-orange-500/20 text-orange-400 border-orange-500/30", activeBg: "bg-orange-500 text-white" },
  { value: "medium", label: "Medium", bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", activeBg: "bg-yellow-400 text-black" },
  { value: "low", label: "Low", bg: "bg-green-500/20 text-green-400 border-green-500/30", activeBg: "bg-green-500 text-white" },
];

export default function SubmitIssuePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<BugType>("bug");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);

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
      screenshot_url: screenshotUrl || undefined,
      reported_by: currentUser?.id,
      project_id: project.id,
    });

    router.push(`/project/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <Link
          href={`/project/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft size={14} />
          {project.name}
        </Link>

        <h1 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          New Issue
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-surface border border-card-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors min-h-[48px]"
          placeholder="What went wrong?"
          required
          autoFocus
        />

        {/* Type pills */}
        <div className="flex gap-2">
          {bugTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex-1 px-2 py-2 rounded-full text-xs font-medium transition-all min-h-[40px] ${
                type === t.value
                  ? "bg-accent text-black"
                  : "bg-surface border border-card-border text-muted hover:text-foreground hover:border-accent/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Severity pills */}
        <div className="flex gap-2">
          {severities.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`flex-1 px-2 py-2 rounded-full text-xs font-medium transition-all min-h-[40px] border ${
                severity === s.value
                  ? s.activeBg
                  : s.bg
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-surface border border-card-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors min-h-[140px] resize-y"
          placeholder="Describe what happened..."
          required
        />

        {/* Screenshot URL - collapsible */}
        {!showScreenshot ? (
          <button
            type="button"
            onClick={() => setShowScreenshot(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            <ImagePlus size={14} />
            Add screenshot link
          </button>
        ) : (
          <input
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            className="w-full bg-surface border border-card-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
            placeholder="Screenshot URL (optional)"
            autoFocus
          />
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold rounded-xl bg-accent text-black hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[52px] mt-2"
        >
          <Send size={16} />
          {submitting ? "Submitting..." : "Submit Issue"}
        </button>
      </form>
    </div>
  );
}
