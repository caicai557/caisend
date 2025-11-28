import { createFileRoute } from '@tanstack/react-router';
import { PbtTest } from '@/components/pbt-test';

export const Route = createFileRoute('/pbt-test')({
  component: PbtTestPage,
});

function PbtTestPage() {
  return (
    <div className="container mx-auto p-4">
      <PbtTest />
    </div>
  );
}
