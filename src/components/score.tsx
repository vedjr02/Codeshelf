'use client';

import * as React from 'react';
import { Ring } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { gradeColorVar, gradeLabel, type HealthGrade, type HealthReport } from '@/lib/health';

/** Small inline score, for rows and cards. */
export function ScoreChip({
  score,
  grade,
  className,
  showLabel = false,
}: {
  score: number;
  grade: HealthGrade;
  className?: string;
  showLabel?: boolean;
}) {
  const color = gradeColorVar(grade);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[13px] font-medium tabular',
        className
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
      title={`Shelf Score ${score} — ${gradeLabel(grade)}`}
    >
      <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: color }} />
      {score}
      {showLabel && <span className="font-normal opacity-80">{gradeLabel(grade)}</span>}
    </span>
  );
}

/** The score as a ring with the number inside. */
export function ScoreRing({
  score,
  grade,
  size = 96,
  thickness = 8,
  caption,
}: {
  score: number;
  grade: HealthGrade;
  size?: number;
  thickness?: number;
  caption?: string;
}) {
  return (
    <Ring
      value={score}
      size={size}
      thickness={thickness}
      color={gradeColorVar(grade)}
      label={`Shelf Score ${score} out of 100`}
    >
      <span
        className="font-semibold tabular tracking-[-0.03em]"
        style={{ fontSize: size * 0.3, lineHeight: 1 }}
      >
        {score}
      </span>
      {caption && <span className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.07em] text-ink-4">{caption}</span>}
    </Ring>
  );
}

/**
 * The full breakdown. Shown wherever a score needs to justify itself —
 * a number nobody can interrogate is just decoration.
 */
export function ScoreBreakdown({ report, className }: { report: HealthReport; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {report.factors.map((factor) => {
        const pct = factor.max === 0 ? 0 : (factor.score / factor.max) * 100;
        const complete = factor.score === factor.max;
        return (
          <li key={factor.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14.5px] font-medium text-ink">{factor.label}</span>
              <span className="text-[13px] tabular text-ink-4">
                {factor.score}/{factor.max}
              </span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-standard)]"
                style={{
                  width: `${pct}%`,
                  backgroundColor: complete ? 'var(--color-good)' : 'var(--color-ink-4)',
                }}
              />
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
              {factor.detail}
              {factor.hint && <span className="text-ink-4"> — {factor.hint}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
