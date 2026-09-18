import { Skeleton } from "@/components/Skeleton";

export default function ProjectsLoading() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="mb-2 h-6 w-32" />
      <Skeleton className="mb-6 h-4 w-64" />
      <Skeleton className="mb-6 h-20 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
