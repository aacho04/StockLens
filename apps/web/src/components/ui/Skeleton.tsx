import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, width, height }) => (
  <div
    className={clsx("skeleton", className)}
    style={{ width, height: height ?? "1rem" }}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={clsx("flex flex-col gap-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height="14px" width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx("glass-card p-5 space-y-4", className)}>
    <div className="flex items-center justify-between">
      <Skeleton height="20px" width="120px" />
      <Skeleton height="24px" width="60px" />
    </div>
    <Skeleton height="36px" width="160px" />
    <Skeleton height="14px" width="200px" />
  </div>
);
