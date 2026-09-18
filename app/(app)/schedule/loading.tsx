import { Skeleton, SkeletonGrid } from "@/components/Skeleton";

export default function ScheduleLoading() {
  return (
    <div>
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-5 h-4 w-96 max-w-full" />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-8" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-5 h-32 w-full rounded-lg" />
      <SkeletonGrid />
    </div>
  );
}
