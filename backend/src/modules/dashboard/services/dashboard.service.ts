import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { canSeeOwners } from '../../../common/constants/owner-visibility';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { AuditLogEntry } from '../../audit-log/entities/audit-log-entry.entity';
import {
  ClientLocation,
  ClientLocationStatus,
} from '../../client-locations/entities/client-location.entity';
import { Contact, ContactStatus } from '../../contacts/entities/contact.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { Post } from '../../posts/entities/post.entity';
import { Product } from '../../products/entities/product.entity';
import { Project } from '../../projects/entities/project.entity';
import { ServiceCategory } from '../../service-catalog/entities/service-category.entity';
import { Testimonial, TestimonialStatus } from '../../testimonials/entities/testimonial.entity';
import { User } from '../../users/entities/user.entity';
import {
  RECENT_ACTIVITY_LIMIT,
  RESTRICTED_AUDIT_ACTION_PREFIX,
  TREND_WINDOW_DAYS,
} from '../constants/dashboard.constants';
import {
  ContactCountDto,
  CountTrendDto,
  DashboardSummaryResponseDto,
  PublicationCountDto,
  VisibilityCountDto,
} from '../dto/dashboard-summary-response.dto';
import { RecentActivityItemDto } from '../dto/recent-activity-response.dto';
import {
  CountWindow,
  DashboardCountsRepository,
  GroupedCount,
} from '../repositories/dashboard-counts.repository';

import {
  maskOwnerActor,
  restrictAuditToViewer,
} from '../../audit-log/utils/audit-owner-visibility';

const DAY_MS = 24 * 60 * 60 * 1000;
const STAFF_ROLES: string[] = [Role.OWNER, Role.ADMIN, Role.STAFF];

@Injectable()
export class DashboardService {
  constructor(
    private readonly counts: DashboardCountsRepository,
    @InjectRepository(AuditLogEntry) private readonly auditEntries: Repository<AuditLogEntry>,
  ) {}

  async getSummary(locale: Locale, viewerRole?: Role | null): Promise<DashboardSummaryResponseDto> {
    const now = Date.now();
    const window: CountWindow = {
      since: new Date(now - TREND_WINDOW_DAYS * DAY_MS),
      previousSince: new Date(now - 2 * TREND_WINDOW_DAYS * DAY_MS),
    };
    const [posts, products, projects, services, testimonials, locations, users, contacts, media] =
      await Promise.all([
        this.counts.countGrouped(Post, 'status', window),
        this.counts.countGrouped(Product, 'status', window),
        this.counts.countGrouped(Project, 'status', window),
        this.counts.countGrouped(ServiceCategory, 'status', window),
        this.counts.countGrouped(Testimonial, 'status', window),
        this.counts.countGrouped(ClientLocation, 'status', window),
        this.counts
          .countGrouped(User, 'role', window)
          .then((rows) => rows.filter((row) => canSeeOwners(viewerRole) || row.key !== Role.OWNER)),
        this.counts.countGrouped(Contact, 'status', window),
        this.counts.countGrouped(MediaAsset, null, window),
      ]);

    return {
      locale,
      generatedAt: new Date(now).toISOString(),
      posts: this.toPublicationCount(posts),
      products: this.toPublicationCount(products),
      projects: this.toPublicationCount(projects),
      services: this.toPublicationCount(services),
      testimonials: this.toVisibilityCount(testimonials, TestimonialStatus.PUBLISHED),
      clientLocations: this.toVisibilityCount(locations, ClientLocationStatus.PUBLISHED),
      customers: this.toTrend(users.filter((row) => row.key === Role.CUSTOMER)),
      staffUsers: this.toTrend(users.filter((row) => row.key && STAFF_ROLES.includes(row.key))),
      contacts: this.toContactCount(contacts),
      mediaAssets: this.toTrend(media),
    };
  }

  async getRecentActivity(user: AuthenticatedUser): Promise<RecentActivityItemDto[]> {
    const builder = this.auditEntries
      .createQueryBuilder('entry')
      .orderBy('entry.occurredAt', 'DESC')
      .addOrderBy('entry.id', 'ASC')
      .limit(RECENT_ACTIVITY_LIMIT);
    if (!roleHasPermission(user.role, Permission.AUDIT_LOG_READ)) {
      builder.where('entry.action NOT LIKE :restricted', {
        restricted: `${RESTRICTED_AUDIT_ACTION_PREFIX}%`,
      });
    }
    await restrictAuditToViewer(builder, this.auditEntries.manager, user.role);
    const entries = await builder.getMany();
    return entries.map((entry) => ({
      id: entry.id,
      actorName: maskOwnerActor(entry, user.role).actorName,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId,
      occurredAt: entry.occurredAt.toISOString(),
    }));
  }

  private toTrend(rows: GroupedCount[]): CountTrendDto {
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const recent = rows.reduce((sum, row) => sum + row.recent, 0);
    const previous = rows.reduce((sum, row) => sum + row.previous, 0);
    return {
      total,
      createdLast30Days: recent,
      createdPrevious30Days: previous,
      changePercent:
        previous === 0 ? null : Math.round(((recent - previous) / previous) * 1000) / 10,
    };
  }

  private totalFor(rows: GroupedCount[], key: string): number {
    return rows.find((row) => row.key === key)?.total ?? 0;
  }

  private toPublicationCount(rows: GroupedCount[]): PublicationCountDto {
    return {
      ...this.toTrend(rows),
      byStatus: {
        draft: this.totalFor(rows, PublicationStatus.DRAFT),
        in_review: this.totalFor(rows, PublicationStatus.IN_REVIEW),
        published: this.totalFor(rows, PublicationStatus.PUBLISHED),
        archived: this.totalFor(rows, PublicationStatus.ARCHIVED),
      },
    };
  }

  private toVisibilityCount(rows: GroupedCount[], publishedKey: string): VisibilityCountDto {
    return {
      ...this.toTrend(rows),
      byStatus: {
        published: this.totalFor(rows, publishedKey),
        hidden: this.totalFor(rows, 'hidden'),
      },
    };
  }

  private toContactCount(rows: GroupedCount[]): ContactCountDto {
    const newCount = this.totalFor(rows, ContactStatus.NEW);
    return {
      ...this.toTrend(rows),
      byStatus: {
        new: newCount,
        seen: this.totalFor(rows, ContactStatus.SEEN),
        replied: this.totalFor(rows, ContactStatus.REPLIED),
        archived: this.totalFor(rows, ContactStatus.ARCHIVED),
      },
      unread: newCount,
    };
  }
}
