import PublicLayout from "@/components/layout/PublicLayout";

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
