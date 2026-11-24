import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollManager from './components/common/ScrollManager';
import AiAdvisorWidget from './components/ai/AiAdvisorWidget';
import ChatWidget from './components/chat/ChatWidget';

import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import ReturnCreatePage from './pages/ReturnCreatePage';
import ReturnDetailPage from './pages/ReturnDetailPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminChatPage from './pages/AdminChatPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminReturnsPage from './pages/AdminReturnsPage';
import AdminReturnDetailPage from './pages/AdminReturnDetailPage';
import AdminDormantReviewsPage from './pages/AdminDormantReviewsPage';
import AdminReturnHolidaysPage from './pages/AdminReturnHolidaysPage';
import AdminOrderStatisticsPage from './pages/AdminOrderStatisticsPage';
import AdminReviewStatisticsPage from './pages/AdminReviewStatisticsPage';
import AdminStatisticsPlaceholderPage from './pages/AdminStatisticsPlaceholderPage';
import AboutUsPage from './pages/AboutUsPage';

export default function App() {
  const { pathname } = useLocation();
  const purchasing = pathname === '/cart' || pathname === '/checkout';
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const hideFloatingWidgets = purchasing || isAuthPage || isAdminPage;
  return (
    <div className="relative flex min-h-screen flex-col">
      <ScrollManager />
      {!isAdminPage && <Header />}

      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/ve-chung-toi" element={<AboutUsPage />} />
          <Route path="/about" element={<Navigate to="/ve-chung-toi" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* User Account Protected Routes */}
          <Route path="/cart" element={<ProtectedRoute requiredRoles={['CUSTOMER']}><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute requiredRoles={['CUSTOMER']}><CheckoutPage /></ProtectedRoute>} />
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/addresses"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/password"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/preferences"
            element={<Navigate to="/account/profile" replace />}
          />
          <Route
            path="/account/orders"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/returns"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/returns/new"
            element={
              <ProtectedRoute>
                <ReturnCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/returns/:id"
            element={
              <ProtectedRoute>
                <ReturnDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Admin & Staff Protected Routes */}
          <Route element={<AdminLayout />}>
          <Route path="/admin" element={<ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />
            <Route
                path="/admin/orders"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminOrdersPage />
                </ProtectedRoute>
                }
            />
            <Route
                path="/admin/statistics/orders"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminOrderStatisticsPage />
                </ProtectedRoute>
                }
            />
            <Route
                path="/admin/statistics/products"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminStatisticsPlaceholderPage title="Thống kê sản phẩm" />
                </ProtectedRoute>
                }
            />
            <Route
                path="/admin/statistics/returns"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminStatisticsPlaceholderPage title="Thống kê phiếu trả" />
                </ProtectedRoute>
                }
            />
            <Route
                path="/admin/statistics/reviews"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminReviewStatisticsPage />
                </ProtectedRoute>
                }
            />

            <Route
                path="/admin/promotions"
                element={
                <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                    <AdminPromotionsPage />
                </ProtectedRoute>
                }
            />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/returns"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminReturnsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/returns/dormant"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <AdminDormantReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/returns/holidays"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminReturnHolidaysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/returns/:id"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminReturnDetailPage />
              </ProtectedRoute>
            }
          />

          </Route>

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div className="container py-20 text-center">
                <h1 className="text-2xl font-bold uppercase tracking-wider">404</h1>
                <p className="mt-3 text-base text-content-secondary">
                  Trang bạn tìm kiếm không tồn tại hoặc đã được di dời.
                </p>
              </div>
            }
          />
        </Routes>
      </main>

      {!isAdminPage && <Footer />}

      {/* Floating AI Stylist Advisor Widget & Realtime Customer Support Chat Widget */}
      {!hideFloatingWidgets && (
        <div>
          <AiAdvisorWidget />
          <ChatWidget />
        </div>
      )}
    </div>
  );
}
