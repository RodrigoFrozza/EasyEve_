import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96 opacity-50" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-eve-panel/40 border-eve-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-48 opacity-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs & Content Skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-eve-panel/20 rounded-lg w-fit">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>

        <Card className="bg-eve-panel/40 border-eve-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px] opacity-50" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
