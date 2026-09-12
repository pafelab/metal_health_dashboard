// UX-03: what the shell renders INSTEAD of a page until the first successful sheet response.
// Zero-valued KPI cards and 'ไม่มีข้อมูล' charts read as "no incidents", so nothing data-driven
// may render before we know the real numbers — grey placeholders stand in, and the only thing
// announced to assistive tech is 'กำลังโหลดข้อมูล'.

import type { ReactNode } from 'react'

export interface LoadingSkeletonProps {
  /** Visually-hidden text announced while the placeholders are on screen. */
  label?: string
}

/** One pulsing grey block. `motion-reduce` keeps it static for reduced-motion users. */
function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse motion-reduce:animate-none rounded-lg bg-slate-200 ${className ?? ''}`} />
}

function CardShell({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-white shadow-card p-5 space-y-4">{children}</div>
}

export default function LoadingSkeleton({ label = 'กำลังโหลดข้อมูล' }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[calc(100vh-128px)]">
      <span className="sr-only">{label}</span>

      {/* Filter sidebar skeleton */}
      <div className="hidden lg:block w-80 shrink-0 border-r border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <Block className="h-6 w-32" />
          <Block className="h-6 w-12" />
        </div>
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
        <Block className="h-10 w-full" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 min-w-0 p-6 space-y-6">
        {/* Section jump pills */}
        <div className="flex flex-wrap gap-2">
          <Block className="h-10 w-32 rounded-full" />
          <Block className="h-10 w-44 rounded-full" />
          <Block className="h-10 w-36 rounded-full" />
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <CardShell key={i}>
              <Block className="h-4 w-24" />
              <Block className="h-10 w-20" />
              <Block className="h-3 w-32" />
            </CardShell>
          ))}
        </div>

        {/* Chart row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <CardShell key={i}>
              <Block className="h-5 w-48" />
              <Block className="h-56 w-full" />
            </CardShell>
          ))}
        </div>

        {/* Full-width chart / map */}
        <CardShell>
          <Block className="h-5 w-56" />
          <Block className="h-72 w-full" />
        </CardShell>

        {/* Table */}
        <CardShell>
          <Block className="h-5 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Block key={i} className="h-8 w-full" />
          ))}
        </CardShell>
      </div>
    </div>
  )
}
