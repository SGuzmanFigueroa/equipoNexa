import { Skeleton } from "@/components/Skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div>
          <Skeleton className="mb-1 h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      </div>
      <Skeleton className="mb-2 h-4 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
