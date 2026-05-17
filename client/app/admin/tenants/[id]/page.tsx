import TenantDetailClient from "./TenantDetailClient";

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function TenantDetailPage() {
  return <TenantDetailClient />;
}
