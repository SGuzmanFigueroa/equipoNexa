import { Skeleton, SkeletonStatCards, SkeletonTable } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="mb-2 h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <SkeletonStatCards />
      <Skeleton className="mb-5 h-10 w-full max-w-xl" />
      <SkeletonTable />
    </div>
  );
}
