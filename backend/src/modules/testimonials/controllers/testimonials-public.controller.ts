import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PublicTestimonialsQueryDto } from '../dto/testimonial-queries.dto';
import { TestimonialPublicResponseDto } from '../dto/testimonial-response.dto';
import { TestimonialsService } from '../services/testimonials.service';

@PublicController('testimonials')
export class TestimonialsPublicController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @ApiOperation({ summary: 'Published customer testimonials in the requested locale' })
  @ApiOkResponse({ type: [TestimonialPublicResponseDto] })
  list(
    @Query() query: PublicTestimonialsQueryDto,
  ): Promise<PaginatedResponseDto<TestimonialPublicResponseDto>> {
    return this.testimonials.listPublic(query);
  }
}
