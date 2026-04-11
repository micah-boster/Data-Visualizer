import { Suspense } from 'react';
import { DataDisplay } from '@/components/data-display';
import { LoadingState } from '@/components/loading-state';

export default function Home() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DataDisplay />
    </Suspense>
  );
}
