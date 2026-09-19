import { ApiError, isApiError } from "./client";

const FIELD_LABELS: Record<string, string> = {
  fullName: "Họ và tên",
  email: "Email",
  phone: "Số điện thoại",
  password: "Mật khẩu",
  newPassword: "Mật khẩu mới",
  currentPassword: "Mật khẩu hiện tại",
  identifier: "Email hoặc số điện thoại",
  code: "Mã xác nhận",
};

const PASSWORD_POLICY = "Mật khẩu phải dài 10-128 ký tự, gồm chữ thường, chữ hoa và chữ số.";

/** Vietnamese message for a single failing field. */
function describeField(field: string, messages: string[]): string {
  const label = FIELD_LABELS[field];
  if (field === "password" || field === "newPassword") return PASSWORD_POLICY;
  if (field === "code") return "Mã xác nhận gồm đúng 6 chữ số.";
  if (label) return `${label} không hợp lệ.`;
  return messages[0] ?? "Giá trị không hợp lệ.";
}

/** Maps VALIDATION_FAILED details to `{ field: message }` (Vietnamese). Empty for other errors. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.code !== "VALIDATION_FAILED") return {};
  const result: Record<string, string> = {};
  for (const detail of error.fieldErrors) {
    if (!(detail.field in result)) result[detail.field] = describeField(detail.field, detail.messages);
  }
  return result;
}

export type ErrorContext = "login" | "register" | "password" | "reset" | "admin-session" | "generic";

/** User-facing Vietnamese message for any thrown error. */
export function describeApiError(error: unknown, context: ErrorContext = "generic"): string {
  if (!isApiError(error)) return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
  return describeByCode(error, context);
}

function describeByCode(error: ApiError, context: ErrorContext): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "Email/số điện thoại hoặc mật khẩu không đúng.";
    case "ACCOUNT_LOCKED":
      return "Tài khoản đang bị khoá tạm thời. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
    case "INVALID_PASSWORD":
      return context === "admin-session"
        ? "Mật khẩu chưa đúng. Vui lòng nhập lại."
        : "Mật khẩu hiện tại chưa đúng.";
    case "INVALID_RESET_CODE":
      return "Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.";
    case "SESSION_EXPIRED":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case "RATE_LIMITED":
      return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
    case "UNAUTHORIZED":
      return "Bạn cần đăng nhập để tiếp tục.";
    case "ADMIN_SESSION_REQUIRED":
      return "Phiên quản trị đã hết hạn. Vui lòng xác nhận lại mật khẩu.";
    case "FORBIDDEN":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "NOT_FOUND":
      return "Không tìm thấy dữ liệu yêu cầu.";
    case "CONFLICT":
      return context === "register"
        ? "Email hoặc số điện thoại này đã được đăng ký."
        : "Dữ liệu bị trùng hoặc xung đột. Vui lòng kiểm tra lại.";
    case "VALIDATION_FAILED": {
      const fields = getFieldErrors(error);
      const first = Object.values(fields)[0];
      return first ?? "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.";
    }
    case "NETWORK_ERROR":
      return "Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.";
    case "TIMEOUT":
      return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
    case "SERVICE_UNAVAILABLE":
      return "Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.";
    case "INTERNAL_ERROR":
      return "Máy chủ gặp sự cố. Vui lòng thử lại sau.";
    default:
      return error.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
}
