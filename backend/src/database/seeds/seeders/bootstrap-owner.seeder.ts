import { Role } from '../../../common/enums/role.enum';
import { bootstrapOwnerConfig } from '../../../config/bootstrap-owner.config';
import { User } from '../../../modules/users/entities/user.entity';
import { seedBootstrapOwner } from '../../../modules/users/seeds/bootstrap-owner.seed';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';

export class BootstrapOwnerSeeder implements Seeder {
  readonly name = 'bootstrap-owner';
  readonly description = 'Creates the first owner account from BOOTSTRAP_OWNER_* when none exists';
  readonly dependsOn: readonly string[] = [];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const ownerExists = await context.dataSource
      .getRepository(User)
      .exist({ where: { role: Role.OWNER } });
    if (ownerExists) {
      builder.skip();
      return builder.summary;
    }

    const settings = context.options.bootstrapOwner ?? bootstrapOwnerConfig();
    if (context.options.dryRun) {
      const configured = settings.email && settings.phone && settings.fullName && settings.password;
      if (configured) builder.created();
      else builder.fail('owner', 'BOOTSTRAP_OWNER_* is not configured and no owner exists');
      return builder.summary;
    }

    try {
      const result = await seedBootstrapOwner(context.dataSource, settings);
      if (result === 'created') builder.created();
      else if (result === 'skipped-owner-exists') builder.skip();
      else builder.fail('owner', 'BOOTSTRAP_OWNER_* is not configured and no owner exists');
    } catch (error) {
      builder.fail('owner', error);
    }
    return builder.summary;
  }
}
