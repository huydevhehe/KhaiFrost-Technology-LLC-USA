import request from 'supertest';
import { createTestingApp, TestingApp } from './support';

describe('Health (e2e)', () => {
  let testing: TestingApp;

  beforeAll(async () => {
    testing = await createTestingApp();
  });

  afterAll(async () => {
    await testing.close();
  });

  it('GET /api/v1/health reports the database as up', async () => {
    const response = await request(testing.app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.info.database.status).toBe('up');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('wraps unknown routes in the error shape with the request id', async () => {
    const response = await request(testing.app.getHttpServer())
      .get('/api/v1/nope')
      .set('X-Request-Id', 'test-request-0001')
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBe('test-request-0001');
  });

  it('rejects unsafe requests from a foreign origin', async () => {
    const response = await request(testing.app.getHttpServer())
      .post('/api/v1/anything')
      .set('Origin', 'https://evil.example')
      .expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
