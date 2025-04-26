/**
 * @fileoverview API response and request types
 * @module types/api
 */

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: PaginationInfo;
  error?: {
    message: string;
    details?: string;
  };
  warning?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  data: T;
  pagination?: PaginationInfo;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError; 