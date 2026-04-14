import { redirect } from "next/navigation";

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /customers/[id] → /profile/[id]
 * Старый путь перенаправляется на новую страницу профиля.
 */
export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  redirect(`/profile/${id}`);
}
