import { getCustomRepository } from 'typeorm';
import CategoryRepository from '../repositories/CategoryRepository';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
}

class CategoryService {
  public async execute({ title }: RequestDTO): Promise<Category | null> {
    const categoryRepository = getCustomRepository(CategoryRepository);

    const existingCategory = categoryRepository.checkExists(title);

    if (!existingCategory) {
      const createCategory = categoryRepository.create({ title });

      await categoryRepository.save(createCategory);

      const categoryCreated = categoryRepository.checkExists(title);

      return categoryCreated;
    }

    return existingCategory;
  }
}

export default CategoryService;
