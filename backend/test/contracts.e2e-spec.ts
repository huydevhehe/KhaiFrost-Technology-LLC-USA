import { Body, Get, Post, Query } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { PublicController } from '../src/common/decorators/public-controller.decorator';
import { PaginatedResponseDto } from '../src/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../src/common/dto/pagination-query.dto';
import { notFound } from '../src/common/exceptions/exception.factories';
import { createTestingApp, TestingApp } from './support';

class EchoDto {
  @IsString()
  @MinLength(3)
  name!: string;
}

@PublicController('contract-probe')
class ContractProbeController {
  @Get('list')
  list(@Query() query: PaginationQueryDto) {
    return new PaginatedResponseDto([1, 2], {
      page: query.page,
      pageSize: query.pageSize,
      total: 42,
      totalPages: Math.ceil(42 / query.pageSize),
    });
  }

  @Get('missing')
  missing() {
    throw notFound('Probe');
  }

  @Post('echo')
  echo(@Body() body: EchoDto) {
    return body;
  }
}

describe('Shared contracts (e2e)', () => {
  let testing: TestingApp;
  const base = '/api/v1/public/contract-probe';

  beforeAll(async () => {
    testing = await createTestingApp({ controllers: [ContractProbeController] });
  });

  afterAll(async () => {
    await testing.close();
  });

  it('wraps plain results in data', async () => {
    const response = await request(testing.app.getHttpServer())
      .post(`${base}/echo`)
      .send({ name: 'abc' })
      .expect(201);
    expect(response.body).toEqual({ data: { name: 'abc' } });
  });

  it('moves pagination into meta and applies query defaults', async () => {
    const response = await request(testing.app.getHttpServer()).get(`${base}/list`).expect(200);
    expect(response.body).toEqual({
      data: [1, 2],
      meta: { page: 1, pageSize: 20, total: 42, totalPages: 3 },
    });
  });

  it('maps validation problems to VALIDATION_FAILED with per-field details', async () => {
    const response = await request(testing.app.getHttpServer())
      .post(`${base}/echo`)
      .send({ name: 'a', extra: true })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.requestId).toBeDefined();
    const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields.sort()).toEqual(['extra', 'name']);
  });

  it('rejects out-of-range pagination', async () => {
    const response = await request(testing.app.getHttpServer())
      .get(`${base}/list?pageSize=500`)
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('renders application exceptions in the error shape', async () => {
    const response = await request(testing.app.getHttpServer()).get(`${base}/missing`).expect(404);
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Probe not found' });
  });
});
