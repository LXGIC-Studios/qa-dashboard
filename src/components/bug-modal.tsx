"use client";

import { useState, useEffect } from "react";
import { Modal } from "./modal";
import type { Bug, Severity, BugStatus } from "@/lib/types";
import { getProjects } from "@/lib/store";

interface BugModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (bug: Bug) => void;
  bug?: Bug | null;
  projectId?: string;
}

export function BugModal({ open, onClose, onSave, bug, projectId }: BugModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [status, setStatus] = useState<BugStatus>("open");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const projects = typeof window !== "undefined" ? getProjects() : [];

  useEffect(() => {
    if (bug) {
      setTitle(bug.title);
      setDescription(bug.description);
      setSeverity(bug.severity);
      setStatus(bug.status);
      setSelectedProjectId(bug.projectId);
      setStepsToReproduce(bug.stepsToReproduce || "");
      setAssignedTo(bug.assignedTo || "");
    } else {
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setStatus("open");
      setSelectedProjectId(projectId || "");
      setStepsToReproduce("");
      setAssignedTo("");
    }
  }, [bug, projectId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    onSave({
      id: bug?.id || `bug-${Date.now()}`,
      projectId: selectedProjectId,
      title,
      description,
      severity,
      status,
      stepsToReproduce: stepsToReproduce || undefined,
      assignedTo: assignedTo || undefined,
      createdAt: bug?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20";

  return (
    <Modal open={open} onClose={onClose} title={bug ? "Edit Bug" : "New Bug"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Title</label>
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
          <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
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
            <label className="block text-xs font-medium text-muted mb-1.5">Severity</label>
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
            <label className="block text-xs font-medium text-muted mb-1.5">Status</label>
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

        {!projectId && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Steps to Reproduce
          </label>
          <textarea
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder="1. Go to...\n2. Click on...\n3. Observe..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Assigned To</label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={inputClass}
            placeholder="Team member name"
          />
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
