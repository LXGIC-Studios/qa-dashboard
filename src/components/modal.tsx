"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`bg-card border border-card-border md:rounded-xl w-full ${
          wide ? "md:max-w-2xl" : "md:max-w-lg"
        } max-h-full md:max-h-[85vh] overflow-y-auto rounded-t-2xl md:rounded-xl`}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-card-border sticky top-0 bg-card rounded-t-2xl md:rounded-t-xl z-10">
          {/* Mobile drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30 md:hidden" />
          <h2 className="text-lg font-bold font-[family-name:var(--font-heading)] mt-2 md:mt-0">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 md:p-5 pb-8 md:pb-5">{children}</div>
      </div>
    </div>
  );
}
