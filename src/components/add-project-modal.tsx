"use client";

import { useState, useEffect } from "react";
import { Modal } from "./modal";
import { addProject } from "@/lib/store";
import type { Platform, ProjectStatus } from "@/lib/types";

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddProjectModal({
  open,
  onClose,
  onAdded,
}: AddProjectModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setUrl("");
      setPlatform("web");
      setStatus("active");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    await addProject({
      name,
      slug,
      url: url || undefined,
      platform,
      status,
    });

    setSaving(false);
    onAdded();
    onClose();
  };

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20";

  return (
    <Modal open={open} onClose={onClose} title="Add Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="My Awesome Project"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className={inputClass}
            >
              <option value="web">Web</option>
              <option value="ios">iOS</option>
              <option value="both">Web + iOS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="in-dev">In Development</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-black font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            Add Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
