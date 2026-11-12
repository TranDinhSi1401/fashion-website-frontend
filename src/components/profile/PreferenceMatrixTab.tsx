import React, { useEffect, useState } from 'react';
import { Sparkles, Eye, Clock, CheckSquare, ShoppingBag, Award, Palette, Scissors, RefreshCw } from 'lucide-react';
import { behaviorService } from '../../services/behaviorService';
import { UserPreferenceScoreResponse, UserPreferenceProfileResponse } from '../../types/behavior';
import { cn } from '../../utils/cn';
import styles from './PreferenceMatrixTab.module.css';

export default function PreferenceMatrixTab() {
  const [scores, setScores] = useState<UserPreferenceScoreResponse | null>(null);
  const [profile, setProfile] = useState<UserPreferenceProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scoresData, profileData] = await Promise.all([
        behaviorService.getMyPreferenceScores(),
        behaviorService.getMyPreferences()
      ]);
      setScores(scoresData);
      setProfile(profileData);
    } catch (err) {
      console.warn('Lỗi khi tải ma trận sở thích:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-10 text-center text-content-secondary">
        <RefreshCw size={24} className="animate-spin mb-3 mx-auto" />
        <p className="m-0 text-[0.9rem]">Đang tải ma trận sở thích và tính toán chỉ số Feature Store...</p>
      </div>
    );
  }

  const categoryScores = scores?.categoryScores || [];
  const maxScore = Math.max(...categoryScores.map(c => c.score), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-primary text-content-inverse p-6 rounded-btn border-l-4 border-accent-gold flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={18} className="text-accent-gold" />
            <span className="text-[0.78rem] font-extrabold tracking-[0.1em] text-accent-gold uppercase">
              FEATURE STORE CÁ NHÂN HÓA
            </span>
          </div>
          <h2 className="text-[1.4rem] font-extrabold m-0 mb-1.5 text-content-inverse">
            Ma Trận Sở Thích &amp; Phong Cách Của Bạn
          </h2>
          <p className={cn('text-[0.82rem] m-0 max-w-[580px] leading-normal', styles.bannerDesc)}>
            Hệ thống tự động ghi nhận hành vi xem, dừng chân &gt;15s, chọn size/màu và thêm giỏ hàng để tính toán điểm gu thời trang chuẩn xác cho AI tư vấn.
          </p>
        </div>

        <button type="button" onClick={loadData} className={styles.refreshBtn}>
          <RefreshCw size={14} />
          <span>Làm mới chỉ số</span>
        </button>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-line-light p-[18px] rounded-btn">
          <div className="flex items-center gap-2 text-accent-gold mb-2">
            <Award size={18} />
            <span className="text-[0.75rem] font-bold uppercase">Tổng Điểm Gu</span>
          </div>
          <div className="text-[1.8rem] font-black text-content-primary">
            {scores?.totalScore ? scores.totalScore.toFixed(1) : '0.0'}
          </div>
          <span className="text-[0.74rem] text-content-muted">Điểm tương tác tích lũy</span>
        </div>

        <div className="bg-surface border border-line-light p-[18px] rounded-btn">
          <div className="flex items-center gap-2 text-accent-gold mb-2">
            <Palette size={18} />
            <span className="text-[0.75rem] font-bold uppercase">Màu Sắc Ưa Thích</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {profile?.topColors && profile.topColors.length > 0 ? (
              profile.topColors.map((color, idx) => (
                <span
                  key={idx}
                  className="bg-surface-body border border-line px-2 py-[3px] rounded-sm text-[0.78rem] font-bold text-content-primary"
                >
                  {color}
                </span>
              ))
            ) : (
              <span className="text-[0.8rem] text-content-muted">Chưa có dữ liệu</span>
            )}
          </div>
        </div>

        <div className="bg-surface border border-line-light p-[18px] rounded-btn">
          <div className="flex items-center gap-2 text-accent-gold mb-2">
            <Scissors size={18} />
            <span className="text-[0.75rem] font-bold uppercase">Kích Cỡ Thường Chọn</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {profile?.topSizes && profile.topSizes.length > 0 ? (
              profile.topSizes.map((size, idx) => (
                <span
                  key={idx}
                  className="bg-primary text-content-inverse px-2.5 py-[3px] rounded-sm text-[0.78rem] font-extrabold"
                >
                  {size}
                </span>
              ))
            ) : (
              <span className="text-[0.8rem] text-content-muted">Chưa có dữ liệu</span>
            )}
          </div>
        </div>
      </div>

      {/* Category Scores Breakdown */}
      <div className="bg-surface-body border border-line-light rounded-btn overflow-hidden">
        <div className="px-5 py-4 border-b border-line-light bg-surface-elevated">
          <h3 className="text-[0.95rem] font-extrabold m-0 uppercase tracking-[0.04em] text-content-primary">
            Chi Tiết Điểm Số Từng Danh Mục (Category Scores)
          </h3>
        </div>

        {categoryScores.length === 0 ? (
          <div className="p-9 text-center text-content-muted">
            <p className="m-0 mb-2 text-[0.92rem]">Bạn chưa có điểm tương tác nào.</p>
            <p className="m-0 text-[0.8rem] text-content-muted">
              Hãy dạo xem các mẫu áo sơ mi, polo, quần tây và chọn kích cỡ yêu thích để hệ thống xây dựng gu thời trang cho bạn nhé!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-line-light bg-surface-elevated text-content-secondary">
                  <th className="py-3 px-4 font-bold">Danh mục</th>
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1">
                      <Eye size={14} /> Xem (+1)
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1">
                      <Clock size={14} /> &gt;15s (+2)
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1">
                      <CheckSquare size={14} /> Chọn size (+3)
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1">
                      <ShoppingBag size={14} /> Giỏ hàng (+5)
                    </div>
                  </th>
                  <th className="py-3 px-4 font-extrabold text-content-primary">Tổng điểm</th>
                  <th className="py-3 px-4 font-bold min-w-[140px]">Tỷ lệ quan tâm</th>
                </tr>
              </thead>
              <tbody>
                {categoryScores.map((cat) => {
                  const percent = Math.min(100, Math.round((cat.score / maxScore) * 100));
                  return (
                    <tr key={cat.categoryId} className="border-b border-line-light">
                      <td className="py-3.5 px-4 font-bold text-content-primary">
                        {cat.categoryName}
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary">{cat.viewCount}</td>
                      <td className="py-3.5 px-4 text-content-secondary">{cat.dwellCount}</td>
                      <td className="py-3.5 px-4 text-content-secondary">{cat.selectSizeCount}</td>
                      <td className="py-3.5 px-4 text-content-secondary">{cat.cartCount}</td>
                      <td className="py-3.5 px-4 font-extrabold text-accent-gold text-[0.95rem]">
                        {cat.score.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-disabled rounded-btn overflow-hidden">
                            <div
                              className={styles.progressFill}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[0.75rem] font-bold text-content-secondary min-w-[32px]">
                            {percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formula Explanation Note */}
      <div className="p-4 bg-surface border border-dashed border-line rounded-btn text-[0.78rem] text-content-secondary leading-relaxed">
        <strong className="text-content-primary">Công thức tính điểm Ma trận Sở thích:</strong>
        <br />
        <code>Score(U, C) = (View × 1) + (Dwell &gt; 15s × 2) + (Chọn size/màu × 3) + (Giỏ hàng × 5) + (Mua hàng × 10) - (Xóa giỏ × 2)</code>
        <br />
        Dữ liệu này được tự động chuyển nạp cho Google Gemini AI để khi bạn hỏi câu hỏi tư vấn, AI sẽ tự động hiểu gu ăn mặc của bạn mà không cần bạn phải miêu tả lại từ đầu.
      </div>
    </div>
  );
}
