import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import Button from '../components/ui/Button';

/**
 * Trang Chính sách Trả hàng & Hoàn tiền dành cho Khách hàng (/chinh-sach-doi-tra).
 */
export default function ReturnPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="py-12 pb-20">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-line-light pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
              <RotateCcw size={14} />
              <span>Quy định dịch vụ khách hàng</span>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary sm:text-3xl">
              Chính Sách Trả Hàng &amp; Hoàn Tiền
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Áp dụng cho tất cả đơn hàng mua trực tuyến trên hệ thống Fashion Website.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(-1)}
            className="self-start sm:self-auto"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Quay Lại
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          {/* 1. Thời hạn áp dụng */}
          <section className="rounded-card border border-line-light bg-surface-body p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Clock size={20} className="shrink-0 text-content-primary" />
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary">
                1. Thời hạn yêu cầu trả hàng
              </h2>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-content-secondary">
              <li>
                Khách hàng có thể gửi yêu cầu trả hàng trong vòng{' '}
                <strong className="text-content-primary">07 ngày</strong> kể từ thời điểm đơn hàng
                được giao thành công (<strong className="text-content-primary">Đã giao</strong>).
              </li>
              <li>
                Sau khi yêu cầu được cửa hàng phê duyệt, quý khách vui lòng gửi trả hàng trong vòng{' '}
                <strong className="text-content-primary">07 ngày</strong> (bàn giao cho đơn vị vận
                chuyển GHN hoặc mang trực tiếp đến cửa hàng).
              </li>
            </ul>
          </section>

          {/* 2. Điều kiện sản phẩm */}
          <section className="rounded-card border border-line-light bg-surface-body p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <ShieldCheck size={20} className="shrink-0 text-content-primary" />
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary">
                2. Điều kiện chấp nhận trả hàng
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-line-light bg-surface p-4">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-status-success">
                  <CheckCircle2 size={16} />
                  <span>Được chấp nhận</span>
                </div>
                <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-content-secondary">
                  <li>Sản phẩm còn nguyên tem, nhãn mác, chưa qua sử dụng hay giặt ủi.</li>
                  <li>Không có mùi lạ, không bị dính bẩn hoặc hư hại do tác động từ người dùng.</li>
                  <li>
                    Trường hợp sản phẩm lỗi sản xuất hoặc shop giao sai mẫu/size/màu: cần đính kèm
                    từ 1 đến 5 ảnh chụp rõ tình trạng sản phẩm.
                  </li>
                </ul>
              </div>

              <div className="rounded-sm border border-line-light bg-surface p-4">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-status-error">
                  <XCircle size={16} />
                  <span>Không được chấp nhận</span>
                </div>
                <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-content-secondary">
                  <li>Quá thời hạn 07 ngày kể từ ngày giao hàng thành công.</li>
                  <li>Sản phẩm đã mất tem mác, đã giặt, có dấu hiệu đã mặc hoặc tự ý chỉnh sửa.</li>
                  <li>Sản phẩm gửi về không đúng với sản phẩm trong đơn hàng đã đặt.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Hình thức gửi trả & Phí vận chuyển */}
          <section className="rounded-card border border-line-light bg-surface-body p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <Truck size={20} className="shrink-0 text-content-primary" />
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary">
                3. Hình thức gửi hàng &amp; Phí vận chuyển
              </h2>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-content-secondary">
              <li>
                <strong className="text-content-primary">Gửi qua bưu tá GHN:</strong> Shipper sẽ đến
                tận địa chỉ quý khách chọn để lấy hàng trả về kho.
              </li>
              <li>
                <strong className="text-content-primary">Tự mang đến cửa hàng:</strong> Quý khách có
                thể mang trực tiếp sản phẩm đến cửa hàng mà không mất phí vận chuyển.
              </li>
              <li>
                <strong className="text-content-primary">Chi phí vận chuyển chiều hoàn:</strong>{' '}
                Miễn phí 100% nếu sản phẩm bị lỗi sản xuất hoặc cửa hàng giao sai. Nếu khách hàng đổi
                ý không còn nhu cầu, phí vận chuyển gửi trả sẽ được khấu trừ vào số tiền hoàn lại.
              </li>
            </ul>
          </section>

          {/* 4. Kiểm định & Hoàn tiền */}
          <section className="rounded-card border border-line-light bg-surface-body p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <CreditCard size={20} className="shrink-0 text-content-primary" />
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary">
                4. Quy trình kiểm tra &amp; Hoàn tiền
              </h2>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-content-secondary">
              <li>
                Ngay khi kho tiếp nhận kiện hàng, cửa hàng sẽ kiểm tra tình trạng sản phẩm trong vòng{' '}
                <strong className="text-content-primary">02 ngày làm việc</strong> (không tính ngày
                nghỉ lễ theo quy định).
              </li>
              <li>
                Nếu toàn bộ sản phẩm đạt điều kiện, tiền sẽ được chuyển khoản trực tiếp vào tài khoản
                ngân hàng quý khách đã đăng ký.
              </li>
              <li>
                Nếu số lượng đạt điều kiện hoặc phí vận chuyển có thay đổi sau kiểm tra, hệ thống sẽ
                gửi phương án hoàn tiền mới để quý khách xem và xác nhận trước khi chuyển khoản.
              </li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-line-light bg-surface p-5 text-xs text-content-secondary">
            <span>Cần hỗ trợ thêm về đơn hàng của bạn?</span>
            <Link
              to="/account/orders"
              className="font-semibold text-primary underline hover:opacity-80"
            >
              Đi tới Đơn hàng của tôi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
