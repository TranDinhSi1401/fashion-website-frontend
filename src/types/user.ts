export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | string;
export type UserGender = 'MALE' | 'FEMALE' | 'OTHER' | string;
export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface UserResponse {
  id: number;
  username: string;
  fullname?: string | null;
  gender?: UserGender | null;
  dateOfBirth?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: UserRole;
  avt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  deletedAt?: string | null;
}

export interface UserAddressResponse {
  id: number;
  fullAddress: string;
  provinceName: string;
  wardName: string;
  addressType: AddressType;
  isDefault: boolean;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAddressCreationRequest {
  fullAddress: string;
  provinceName: string;
  wardName: string;
  addressType: AddressType;
  isDefault: boolean;
}

export interface UserAddressUpdateRequest {
  fullAddress?: string;
  provinceName?: string;
  wardName?: string;
  addressType?: AddressType;
  isDefault?: boolean;
}

export interface UpdateUserRequest {
  fullname?: string;
  gender?: UserGender;
  dateOfBirth?: string | null;
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

export interface UserPageResponse {
  content: UserResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}


