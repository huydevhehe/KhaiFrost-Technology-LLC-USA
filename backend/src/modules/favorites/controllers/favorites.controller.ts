import { Delete, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerController } from '../../../common/decorators/customer-controller.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ProductCardDto } from '../../products/dto/product-response.dto';
import { FavoriteIdsDto, FavoriteStateDto } from '../dto/favorite-response.dto';
import { FavoritesListQueryDto } from '../dto/favorites-query.dto';
import { FavoritesService } from '../services/favorites.service';

@CustomerController('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'My favourite products (published only) as cards' })
  @ApiResponse({ status: 200, type: ProductCardDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FavoritesListQueryDto,
  ): Promise<PaginatedResponseDto<ProductCardDto>> {
    return this.favorites.list(user.id, query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Ids of all my favourite products, for the heart button state' })
  @ApiResponse({ status: 200, type: FavoriteIdsDto })
  listIds(@CurrentUser() user: AuthenticatedUser): Promise<FavoriteIdsDto> {
    return this.favorites.listIds(user.id);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Add a published product to my favourites (idempotent)' })
  @ApiResponse({ status: 200, type: FavoriteStateDto })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<FavoriteStateDto> {
    return this.favorites.add(user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from my favourites (idempotent)' })
  @ApiResponse({ status: 200, type: FavoriteStateDto })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<FavoriteStateDto> {
    return this.favorites.remove(user.id, productId);
  }
}
