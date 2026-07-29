import * as React from 'react';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { PageHeaderSkeleton, StatCardSkeletonGrid, CardGridSkeleton, FeedSkeletonList } from '@/components/shared/skeletons';

export default function DashboardLoading() {
  return (
    <ContentWrapper>
      <PageHeaderSkeleton />
      <StatCardSkeletonGrid columns={4} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CardGridSkeleton count={2} columns={2} />
        </div>
        <div className="lg:col-span-1">
          <FeedSkeletonList items={5} />
        </div>
      </div>
    </ContentWrapper>
  );
}
