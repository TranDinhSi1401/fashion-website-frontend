import AdminNav from '../components/admin/AdminNav';

interface AdminStatisticsPlaceholderPageProps {
  title: string;
}

export default function AdminStatisticsPlaceholderPage({ title }: AdminStatisticsPlaceholderPageProps) {
  return (
    <div className="container py-8 sm:py-10">
      <AdminNav title={title} subtitle="" />
      <p className="text-sm text-content-secondary">Thống kê {title.toLowerCase().replace(/^thống kê\s*/, '')}</p>
    </div>
  );
}
