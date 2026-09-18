import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function MeLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Skeleton className="mb-2 h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={4} />
    </div>
  );
}
