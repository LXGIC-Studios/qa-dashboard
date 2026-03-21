import { ChecklistItem } from "./types";

const defaultChecklistLabels = [
  { label: "Responsive Design", category: "UI" },
  { label: "Cross-Browser Testing", category: "UI" },
  { label: "Performance Audit", category: "Performance" },
  { label: "Security Scan", category: "Security" },
  { label: "Accessibility (a11y)", category: "Accessibility" },
  { label: "SEO Meta Tags", category: "SEO" },
  { label: "Error Handling", category: "Reliability" },
  { label: "Loading States", category: "UI" },
  { label: "404 Pages", category: "UI" },
  { label: "Analytics Integration", category: "Analytics" },
];

export function generateChecklistForProject(projectId: string): ChecklistItem[] {
  return defaultChecklistLabels.map((item, idx) => ({
    id: `cl-${projectId}-${idx}`,
    projectId,
    label: item.label,
    checked: false,
    category: item.category,
  }));
}
