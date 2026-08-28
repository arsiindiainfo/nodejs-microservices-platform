import { ErrorCode } from '../constants/error-code.enum';

/** §15 Response & Error Envelope */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  service?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
