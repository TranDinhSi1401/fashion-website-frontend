export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | string;
export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface UserResponse {
  id: number;
  username: string;
  fullname?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: UserRole;
  avt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | string;
}

export interface UserAddressResponse {
  id: number;
  fullAddress: string;
  addressType: AddressType;
  isDefault: boolean;
  userId?: number;
}

export interface UserAddressRequest {
  fullAddress: string;
  addressType: AddressType;
  isDefault: boolean;
}

export interface UpdateUserRequest {
  fullname?: string;
  email?: string;
  phone?: string;
  avt?: string;
  role?: UserRole;
  status?: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

