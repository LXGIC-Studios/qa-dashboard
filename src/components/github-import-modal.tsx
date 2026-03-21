"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "./modal";
import { Search, Loader2, Github, Globe, Lock, Check } from "lucide-react";
import { getProjects, addProjects } from "@/lib/store";
import type { Platform } from "@/lib/types";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  updated_at: string;
  private: boolean;
  topics: string[];
  archived: boolean;
}

interface GitHubImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

function formatRepoName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectPlatform(repo: GitHubRepo): Platform {
  const nameLower = repo.name.toLowerCase();
  const topics = repo.topics.map((t) => t.toLowerCase());
  const allText = [nameLower, ...topics].join(" ");

  if (
    allText.includes("ios") ||
    allText.includes("swift") ||
    allText.includes("swiftui")
  ) {
    return "ios";
  }
  if (
    (allText.includes("app") && !allText.includes("web")) ||
    allText.includes("mobile") ||
    allText.includes("react-native") ||
    allText.includes("flutter")
  ) {
    return "ios";
  }
  return "web";
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function GitHubImportModal({
  open,
  onClose,
  onImported,
}: GitHubImportModalProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoading(true);
      setError(null);
      setSelected(new Set());
      setSearch("");

      try {
        const projects = await getProjects();
        setExistingSlugs(new Set(projects.map((p) => p.slug)));
      } catch {
        // ignore
      }

      try {
        const res = await fetch(
          "https://api.github.com/orgs/LXGIC-Studios/repos?per_page=100&sort=updated"
        );
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        const data: GitHubRepo[] = await res.json();
        setRepos(data.filter((r) => !r.archived));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
    );
  }, [repos, search]);

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const importable = filtered.filter((r) => !existingSlugs.has(r.name));
    if (importable.every((r) => selected.has(r.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of importable) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of importable) next.add(r.id);
        return next;
      });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const selectedRepos = repos.filter((r) => selected.has(r.id));
    const newProjects = selectedRepos.map((repo) => ({
      name: formatRepoName(repo.name),
      slug: repo.name,
      url: repo.homepage || repo.html_url,
      github_url: repo.html_url,
      platform: detectPlatform(repo) as "web" | "ios" | "both",
      status: "active" as const,
      language: repo.language || undefined,
      description: repo.description || undefined,
    }));

    await addProjects(newProjects);
    setImporting(false);
    onImported();
    onClose();
  };

  const importableCount = filtered.filter(
    (r) => !existingSlugs.has(r.name)
  ).length;
  const allImportableSelected =
    importableCount > 0 &&
    filtered
      .filter((r) => !existingSlugs.has(r.name))
      .every((r) => selected.has(r.id));

  return (
    <Modal open={open} onClose={onClose} title="Import from GitHub" wide>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter repos..."
            className="w-full bg-surface border border-card-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
        </div>

        {/* Repo List */}
        <div className="min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg border border-card-border">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-sm text-muted">
                Fetching repos from LXGIC-Studios...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Github size={24} className="text-muted-foreground" />
              <p className="text-sm text-accent-pink">Failed to fetch repos</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-muted">No repos found</p>
              {search && (
                <p className="text-xs text-muted-foreground">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <>
              {importableCount > 0 && (
                <div className="sticky top-0 bg-surface border-b border-card-border px-4 py-2 flex items-center gap-3 z-10">
                  <input
                    type="checkbox"
                    checked={allImportableSelected}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-card-border bg-surface text-accent focus:ring-accent/20 accent-[#00FF66]"
                  />
                  <span className="text-xs text-muted">
                    Select all ({importableCount} importable)
                  </span>
                </div>
              )}

              {filtered.map((repo) => {
                const alreadyImported = existingSlugs.has(repo.name);
                const isSelected = selected.has(repo.id);
                return (
                  <label
                    key={repo.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-card-border last:border-0 transition-colors ${
                      alreadyImported
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-surface/50"
                    }`}
                  >
                    <div className="pt-0.5">
                      {alreadyImported ? (
                        <div className="w-4 h-4 rounded border border-accent/40 bg-accent/10 flex items-center justify-center">
                          <Check size={12} className="text-accent" />
                        </div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRepo(repo.id)}
                          className="w-4 h-4 rounded border-card-border bg-surface text-accent focus:ring-accent/20 accent-[#00FF66]"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{repo.name}</span>
                        {repo.private ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            <Lock size={8} />
                            Private
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                            <Globe size={8} />
                            Public
                          </span>
                        )}
                        {alreadyImported && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">
                            Imported
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-accent-blue" />
                            {repo.language}
                          </span>
                        )}
                        <span>Updated {timeAgo(repo.updated_at)}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted">
            {selected.size} repo{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="px-4 py-2 text-sm rounded-lg bg-accent text-black font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              Import Selected ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
