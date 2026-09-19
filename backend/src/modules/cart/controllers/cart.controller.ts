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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerController } from '../../../common/decorators/customer-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from '../dto/cart-request.dto';
import { CartDto, CartMergeResultDto } from '../dto/cart-response.dto';
import { CartService } from '../services/cart.service';

@CustomerController('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'My cart with current prices, price-change and availability flags' })
  @ApiResponse({ status: 200, type: CartDto })
  get(@CurrentUser() user: AuthenticatedUser, @Query() query: LocaleQueryDto): Promise<CartDto> {
    return this.cart.getCart(user.id, query.locale);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to my cart (one currency per cart)' })
  @ApiResponse({ status: 201, type: CartDto })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocaleQueryDto,
    @Body() dto: AddCartItemDto,
  ): Promise<CartDto> {
    return this.cart.addItem(user.id, dto, query.locale);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Change the quantity of a cart item' })
  @ApiResponse({ status: 200, type: CartDto })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: LocaleQueryDto,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.cart.updateItem(user.id, itemId, dto, query.locale);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove one item from my cart' })
  @ApiResponse({ status: 200, type: CartDto })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: LocaleQueryDto,
  ): Promise<CartDto> {
    return this.cart.removeItem(user.id, itemId, query.locale);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge a guest cart captured before login (idempotent)' })
  @ApiResponse({ status: 200, type: CartMergeResultDto })
  merge(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocaleQueryDto,
    @Body() dto: MergeCartDto,
  ): Promise<CartMergeResultDto> {
    return this.cart.merge(user.id, dto, query.locale);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty my cart' })
  @ApiResponse({ status: 200, type: CartDto })
  clear(@CurrentUser() user: AuthenticatedUser, @Query() query: LocaleQueryDto): Promise<CartDto> {
    return this.cart.clear(user.id, query.locale);
  }
}
