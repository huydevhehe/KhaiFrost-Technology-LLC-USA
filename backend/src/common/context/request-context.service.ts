import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const USER_ID = 'userId';
const REQUEST_ID = 'requestId';
const IP_ADDRESS = 'ipAddress';
const USER_AGENT = 'userAgent';

// Every getter returns undefined outside a request (seeds, scripts, event listeners)
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  get userId(): string | undefined {
    return this.read(USER_ID);
  }

  get requestId(): string | undefined {
    return this.read(REQUEST_ID);
  }

  get ipAddress(): string | undefined {
    return this.read(IP_ADDRESS);
  }

  get userAgent(): string | undefined {
    return this.read(USER_AGENT);
  }

  setUserId(userId: string | undefined): void {
    this.write(USER_ID, userId);
  }

  populate(values: { requestId?: string; ipAddress?: string; userAgent?: string }): void {
    this.write(REQUEST_ID, values.requestId);
    this.write(IP_ADDRESS, values.ipAddress);
    this.write(USER_AGENT, values.userAgent);
  }

  // Lets scripts and seeds run code attributed to a given user
  runAs<T>(userId: string | undefined, callback: () => T): T {
    return this.cls.run(() => {
      this.write(USER_ID, userId);
      return callback();
    });
  }

  private read(key: string): string | undefined {
    return this.cls.isActive() ? this.cls.get<string | undefined>(key) : undefined;
  }

  private write(key: string, value: string | undefined): void {
    if (this.cls.isActive()) this.cls.set(key, value);
  }
}
