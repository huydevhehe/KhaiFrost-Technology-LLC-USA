import { Get } from '@nestjs/common';
import { Column, Entity } from 'typeorm';
import request from 'supertest';
import { Permission } from '../src/common/constants/permissions';
import { RequestContextService } from '../src/common/context/request-context.service';
import { AdminController } from '../src/common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../src/common/decorators/require-permissions.decorator';
import { BaseEntity } from '../src/common/entities/base.entity';
import { SeoTranslationEntity } from '../src/common/entities/seo-translation.entity';
import { Locale } from '../src/common/enums/locale.enum';
import { Role } from '../src/common/enums/role.enum';
import { MediaAsset } from '../src/modules/media/entities/media-asset.entity';
import { asTestUser, createModuleTestingContext, ModuleTestingContext } from './support';

@Entity('sample_things')
class SampleThing extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;
}

@Entity('sample_thing_translations')
class SampleThingTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  thingId!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string;
}

@AdminController('sample-things')
class SampleThingsController {
  @Get()
  @RequirePermissions(Permission.USER_READ)
  list() {
    return [{ ok: true }];
  }
}

describe('createModuleTestingContext', () => {
  let context: ModuleTestingContext;

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, SampleThing, SampleThingTranslation],
      controllers: [SampleThingsController],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  const server = () => context.app.getHttpServer();

  it('rejects anonymous, customer and under-privileged users, accepts admins', async () => {
    await request(server()).get('/api/v1/admin/sample-things').expect(401);
    await request(server())
      .get('/api/v1/admin/sample-things')
      .set(asTestUser({ id: '00000000-0000-4000-8000-000000000001', role: Role.CUSTOMER }))
      .expect(403);
    await request(server())
      .get('/api/v1/admin/sample-things')
      .set(asTestUser({ id: '00000000-0000-4000-8000-000000000002', role: Role.STAFF }))
      .expect(403);
    const response = await request(server())
      .get('/api/v1/admin/sample-things')
      .set(asTestUser({ id: '00000000-0000-4000-8000-000000000003', role: Role.ADMIN }))
      .expect(200);
    expect(response.body).toEqual({ data: [{ ok: true }] });
  });

  it('fills createdById from the request context and stores SEO columns with a media foreign key', async () => {
    const userId = '00000000-0000-4000-8000-0000000000aa';
    const requestContext = context.moduleRef.get(RequestContextService);
    const things = context.dataSource.getRepository(SampleThing);
    const translations = context.dataSource.getRepository(SampleThingTranslation);

    const thing = await requestContext.runAs(userId, () =>
      things.save(things.create({ name: 'a' })),
    );
    expect(thing.createdById).toBe(userId);
    expect(thing.id).toMatch(/^[0-9a-f-]{36}$/);

    const saved = await translations.save(
      translations.create({
        thingId: thing.id,
        locale: Locale.VI,
        title: 'Tiêu đề',
        seoTitle: 'SEO',
      }),
    );
    expect(saved.noIndex).toBe(false);

    await expect(
      translations.save(
        translations.create({
          thingId: thing.id,
          locale: Locale.EN,
          title: 'Title',
          ogImageId: '00000000-0000-4000-8000-00000000ffff',
        }),
      ),
    ).rejects.toThrow();
  });
});
