import React, { useEffect, useState } from 'react';
import { Sparkles, Eye, Clock, CheckSquare, ShoppingBag, Award, Palette, Scissors, RefreshCw } from 'lucide-react';
import { behaviorService } from '../../services/behaviorService';
import { UserPreferenceScoreResponse, UserPreferenceProfileResponse } from '../../types/behavior';

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
      <div style={{ padding: '40px', textAlign: 'center', color: '#666666' }}>
        <RefreshCw size={24} className="spin-animation" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '12px' }} />
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Đang tải ma trận sở thích và tính toán chỉ số Feature Store...</p>
      </div>
    );
  }

  const categoryScores = scores?.categoryScores || [];
  const maxScore = Math.max(...categoryScores.map(c => c.score), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#111111',
          color: '#FFFFFF',
          padding: '24px',
          borderRadius: '4px',
          borderLeft: '4px solid #C5A059',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={18} color="#C5A059" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.1em', color: '#C5A059', textTransform: 'uppercase' }}>
              FEATURE STORE CÁ NHÂN HÓA
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF' }}>
            Ma Trận Sở Thích & Phong Cách Của Bạn
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#AAAAAA', margin: 0, maxWidth: '580px', lineHeight: 1.5 }}>
            Hệ thống tự động ghi nhận hành vi xem, dừng chân &gt;15s, chọn size/màu và thêm giỏ hàng để tính toán điểm gu thời trang chuẩn xác cho AI tư vấn.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <RefreshCw size={14} />
          <span>Làm mới chỉ số</span>
        </button>
      </div>

      {/* Quick Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <div style={{ backgroundColor: '#F8F8F9', border: '1px solid #EAEAEA', padding: '18px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C5A059', marginBottom: '8px' }}>
            <Award size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Điểm Gu</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#111111' }}>
            {scores?.totalScore ? scores.totalScore.toFixed(1) : '0.0'}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#888888' }}>Điểm tương tác tích lũy</span>
        </div>

        <div style={{ backgroundColor: '#F8F8F9', border: '1px solid #EAEAEA', padding: '18px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C5A059', marginBottom: '8px' }}>
            <Palette size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Màu Sắc Ưa Thích</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {profile?.topColors && profile.topColors.length > 0 ? (
              profile.topColors.map((color, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DDD',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#222'
                  }}
                >
                  {color}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#999' }}>Chưa có dữ liệu</span>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#F8F8F9', border: '1px solid #EAEAEA', padding: '18px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C5A059', marginBottom: '8px' }}>
            <Scissors size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Kích Cỡ Thường Chọn</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {profile?.topSizes && profile.topSizes.length > 0 ? (
              profile.topSizes.map((size, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#111111',
                    color: '#FFFFFF',
                    padding: '3px 10px',
                    borderRadius: '3px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}
                >
                  {size}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#999' }}>Chưa có dữ liệu</span>
            )}
          </div>
        </div>
      </div>

      {/* Category Scores Breakdown */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EBEBEB', backgroundColor: '#FAFAFA' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Chi Tiết Điểm Số Từng Danh Mục (Category Scores)
          </h3>
        </div>

        {categoryScores.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#888888' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>Bạn chưa có điểm tương tác nào.</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#AAAAAA' }}>
              Hãy dạo xem các mẫu áo sơ mi, polo, quần tây và chọn kích cỡ yêu thích để hệ thống xây dựng gu thời trang cho bạn nhé!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EBEBEB', backgroundColor: '#FDFDFD', color: '#666666' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Danh mục</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={14} /> Xem (+1)
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> &gt;15s (+2)
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckSquare size={14} /> Chọn size (+3)
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShoppingBag size={14} /> Giỏ hàng (+5)
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#111111' }}>Tổng điểm</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, minWidth: '140px' }}>Tỷ lệ quan tâm</th>
                </tr>
              </thead>
              <tbody>
                {categoryScores.map((cat) => {
                  const percent = Math.min(100, Math.round((cat.score / maxScore) * 100));
                  return (
                    <tr key={cat.categoryId} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111111' }}>
                        {cat.categoryName}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#444444' }}>{cat.viewCount}</td>
                      <td style={{ padding: '14px 16px', color: '#444444' }}>{cat.dwellCount}</td>
                      <td style={{ padding: '14px 16px', color: '#444444' }}>{cat.selectSizeCount}</td>
                      <td style={{ padding: '14px 16px', color: '#444444' }}>{cat.cartCount}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#C5A059', fontSize: '0.95rem' }}>
                        {cat.score.toFixed(1)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', backgroundColor: '#EEEEEE', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                backgroundColor: '#C5A059',
                                borderRadius: '4px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666666', minWidth: '32px' }}>
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
      <div
        style={{
          padding: '16px',
          backgroundColor: '#F9F9FA',
          border: '1px dashed #D0D0D5',
          borderRadius: '4px',
          fontSize: '0.78rem',
          color: '#666666',
          lineHeight: 1.6
        }}
      >
        <strong style={{ color: '#111111' }}>Công thức tính điểm Ma trận Sở thích:</strong>
        <br />
        <code>Score(U, C) = (View × 1) + (Dwell &gt; 15s × 2) + (Chọn size/màu × 3) + (Giỏ hàng × 5) + (Mua hàng × 10) - (Xóa giỏ × 2)</code>
        <br />
        Dữ liệu này được tự động chuyển nạp cho Google Gemini AI để khi bạn hỏi câu hỏi tư vấn, AI sẽ tự động hiểu gu ăn mặc của bạn mà không cần bạn phải miêu tả lại từ đầu.
      </div>
    </div>
  );
}

