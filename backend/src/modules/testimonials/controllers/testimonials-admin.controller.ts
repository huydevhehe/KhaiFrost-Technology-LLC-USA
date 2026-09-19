import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CreateTestimonialDto, UpdateTestimonialDto } from '../dto/testimonial-input.dto';
import { ListTestimonialsQueryDto, ReorderDto } from '../dto/testimonial-queries.dto';
import { TestimonialAdminResponseDto } from '../dto/testimonial-response.dto';
import { TestimonialsService } from '../services/testimonials.service';

@AdminController('testimonials')
export class TestimonialsAdminController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @RequirePermissions(Permission.TESTIMONIAL_READ)
  @ApiOperation({ summary: 'List testimonials' })
  @ApiOkResponse({ type: [TestimonialAdminResponseDto] })
  list(
    @Query() query: ListTestimonialsQueryDto,
  ): Promise<PaginatedResponseDto<TestimonialAdminResponseDto>> {
    return this.testimonials.list(query);
  }

  @Put('reorder')
  @RequirePermissions(Permission.TESTIMONIAL_UPDATE)
  @AuditAction('testimonial.reordered', 'Testimonial')
  @ApiOperation({ summary: 'Set the display order of testimonials' })
  reorder(@Body() dto: ReorderDto): Promise<string[]> {
    return this.testimonials.reorder(dto.ids);
  }

  @Post()
  @RequirePermissions(Permission.TESTIMONIAL_CREATE)
  @AuditAction('testimonial.created', 'Testimonial')
  @ApiOperation({ summary: 'Create a testimonial (staff can only create hidden ones)' })
  @ApiCreatedResponse({ type: TestimonialAdminResponseDto })
  create(
    @Body() dto: CreateTestimonialDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TestimonialAdminResponseDto> {
    return this.testimonials.create(dto, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.TESTIMONIAL_READ)
  @ApiOperation({ summary: 'Read one testimonial with all locales' })
  @ApiOkResponse({ type: TestimonialAdminResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<TestimonialAdminResponseDto> {
    return this.testimonials.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TESTIMONIAL_UPDATE)
  @AuditAction('testimonial.updated', 'Testimonial')
  @ApiOperation({ summary: 'Update a testimonial (optimistic locking via version)' })
  @ApiOkResponse({ type: TestimonialAdminResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<TestimonialAdminResponseDto> {
    return this.testimonials.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.TESTIMONIAL_DELETE)
  @AuditAction('testimonial.deleted', 'Testimonial')
  @ApiOperation({ summary: 'Soft delete a testimonial' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.testimonials.remove(id);
  }
}
