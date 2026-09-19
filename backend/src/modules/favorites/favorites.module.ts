import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { FavoritesController } from './controllers/favorites.controller';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './services/favorites.service';

@Module({
  imports: [ProductsModule, TypeOrmModule.forFeature([Favorite])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
