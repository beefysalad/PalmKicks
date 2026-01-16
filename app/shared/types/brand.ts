export interface Brand {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandPayload {
  name: string;
}

export interface UpdateBrandPayload {
  name: string;
}
