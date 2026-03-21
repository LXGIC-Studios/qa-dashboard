"use client";

import { useState, useEffect } from "react";
import { Modal } from "./modal";
import type { Bug, Severity, BugStatus, Profile } from "@/lib/types";

interface BugModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (bug: {
    title: string;
    description: string;
    severity: Severity;
    status: BugStatus;
    steps_to_reproduce?: string;
    assigned_to?: string;
    project_id: string;
  }) => void;
  bug?: Bug | null;
  projectId?: string;
  profiles?: Profile[];
}

export function BugModal({
  open,
  onClose,
  onSave,
  bug,
  projectId,
  profiles = [],
}: BugModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [status, setStatus] = useState<BugStatus>("open");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (bug) {
      setTitle(bug.title);
      setDescription(bug.description || "");
      setSeverity(bug.severity);
      setStatus(bug.status);
      setStepsToReproduce(bug.steps_to_reproduce || "");
      setAssignedTo(bug.assigned_to || "");
    } else {
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setStatus("open");
      setStepsToReproduce("");
      setAssignedTo("");
    }
  }, [bug, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      severity,
      status,
      steps_to_reproduce: stepsToReproduce || undefined,
      assigned_to: assignedTo || undefined,
      project_id: projectId || bug?.project_id || "",
    });
    onClose();
  };

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20";

  return (
    <Modal open={open} onClose={onClose} title={bug ? "Edit Bug" : "New Bug"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Brief description of the bug"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Detailed description..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className={inputClass}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BugStatus)}
              className={inputClass}
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="wont-fix">Won&apos;t Fix</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Steps to Reproduce
          </label>
          <textarea
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder={"1. Go to...\n2. Click on...\n3. Observe..."}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Assign To
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.email})
              </option>
            ))}
          </select>
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
            className="px-4 py-2 text-sm rounded-lg bg-accent text-black font-medium hover:bg-accent/90 transition-colors"
          >
            {bug ? "Update Bug" : "Create Bug"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
