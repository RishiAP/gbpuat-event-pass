// components/VerifyingUserSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

const VerifyingUserSkeleton = () => {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Image Skeleton */}
      <Skeleton className="h-48 w-full md:w-96 rounded-lg bg-muted" />

      {/* Text Lines Skeleton */}
      <div className="w-full space-y-3">
        <Skeleton className="h-4 w-48 rounded-full bg-muted" />
        <Skeleton className="h-3 w-full max-w-md rounded-full bg-muted" />
        <Skeleton className="h-3 w-11/12 rounded-full bg-muted" />
        <Skeleton className="h-3 w-10/12 rounded-full bg-muted" />
        <Skeleton className="h-3 w-9/12 rounded-full bg-muted" />
        <Skeleton className="h-3 w-8/12 rounded-full bg-muted" />
      </div>

      <span className="sr-only">Verifying user...</span>
    </div>
  );
};

export default VerifyingUserSkeleton;