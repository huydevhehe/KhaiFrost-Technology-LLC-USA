import { Entity, Index } from 'typeorm';
import { CategoryChildEntity } from './category-child.entity';

@Entity('service_category_faq_items')
@Index(['categoryId'])
export class ServiceCategoryFaqItem extends CategoryChildEntity {}
