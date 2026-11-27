export interface CategoryCreationRequest {
  name: string;
  slug?: string;
  parentId: number | null;
  isActive: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug?: string;
  parentId?: number | null;
  isActive?: boolean;
}
