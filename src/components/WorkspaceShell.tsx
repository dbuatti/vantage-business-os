"use client";

import React from "react";

interface WorkspaceShellProps {
  children: React.ReactNode;
  /** Optional page title shown above the content area */
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Optional toolbar rendered between header and content (e.g. tabs / search) */
  toolbar?: React.ReactNode;
}

const WorkspaceShell = ({
  children,
  title,
  description,
  actions,
  toolbar,
}: WorkspaceShellProps) => {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {toolbar}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export default WorkspaceShell;