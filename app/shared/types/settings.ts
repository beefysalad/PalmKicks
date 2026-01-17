export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  errors?: {
    path: string[];
    message: string;
  }[];
}

export interface ChangePasswordData {
  username: string;
  currentPassword: string;
  newPassword: string;
}

export interface AddConfigDataPayload {
  key: string;
  value: string;
}

export interface UpdateConfigPayload {
  id: string;
  value: string;
}
