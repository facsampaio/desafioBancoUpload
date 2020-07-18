import { EntityRepository, Repository } from 'typeorm';

import Category from '../models/Category';

@EntityRepository(Category)
class CategoryRepository extends Repository<Category> {
  public async checkExists(title: string): Promise<Category | null> {
    const findCategory = await this.findOne({ where: { title } });
    return findCategory || null;
  }

  public async getCategoryId(title: string): Promise<string> {
    const findCategory = await this.findOne({ where: { title } });
    if (findCategory) {
      return findCategory.id;
    }
    return 'cant find';
  }
}

export default CategoryRepository;
