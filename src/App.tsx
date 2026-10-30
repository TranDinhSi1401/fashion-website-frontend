import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Topbar from './components/layout/Topbar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminUsersPage from './pages/AdminUsersPage';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Topbar />
      <Header />

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* User Account Protected Routes */}
          <Route path="/cart" element={<ProtectedRoute requiredRoles={['CUSTOMER']}><CartPage /></ProtectedRoute>} />
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

          {/* Admin & Staff Protected Routes */}
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
                <AdminProductsPage />
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

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>404</h1>
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                  Trang bạn tìm kiếm không tồn tại hoặc đã được di dời.
                </p>
              </div>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
