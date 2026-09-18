import { HttpException } from '@nestjs/common';

export class ApplicationException extends HttpException {
  constructor(
    public readonly code: string,
    httpStatus: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, httpStatus);
  }
}
