"use client";

import { useState, useEffect } from "react";
import { Modal } from "./modal";
import type { TestCase, Category, TestStatus } from "@/lib/types";

interface TestCaseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tc: {
    name: string;
    category: Category;
    description?: string;
    expected_result?: string;
    status: TestStatus;
    project_id: string;
  }) => void;
  testCase?: TestCase | null;
  projectId: string;
}

export function TestCaseModal({
  open,
  onClose,
  onSave,
  testCase,
  projectId,
}: TestCaseModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [description, setDescription] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [status, setStatus] = useState<TestStatus>("untested");

  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setCategory(testCase.category);
      setDescription(testCase.description || "");
      setExpectedResult(testCase.expected_result || "");
      setStatus(testCase.status);
    } else {
      setName("");
      setCategory("other");
      setDescription("");
      setExpectedResult("");
      setStatus("untested");
    }
  }, [testCase, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      category,
      description: description || undefined,
      expected_result: expectedResult || undefined,
      status,
      project_id: projectId,
    });
    onClose();
  };

  const inputClass =
    "w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={testCase ? "Edit Test Case" : "New Test Case"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Test case name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputClass}
            >
              <option value="auth">Auth</option>
              <option value="payments">Payments</option>
              <option value="ui">UI</option>
              <option value="api">API</option>
              <option value="performance">Performance</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TestStatus)}
              className={inputClass}
            >
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="skip">Skip</option>
              <option value="untested">Untested</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder="What does this test verify?"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Expected Result
          </label>
          <textarea
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder="What should happen when this test passes?"
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
            {testCase ? "Update Test Case" : "Create Test Case"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
