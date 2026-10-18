import { redirect } from 'next/navigation';

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/prospect/${id}`);
}
