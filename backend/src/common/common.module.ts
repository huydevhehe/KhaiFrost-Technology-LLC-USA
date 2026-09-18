import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestContextService } from './context/request-context.service';
import { ensureRequestId } from './utils/request-id';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, request, response) => {
          cls.set('requestId', ensureRequestId(request, response));
          cls.set('ipAddress', request.ip);
          cls.set('userAgent', request.headers['user-agent']);
        },
      },
    }),
  ],
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class CommonModule {}
