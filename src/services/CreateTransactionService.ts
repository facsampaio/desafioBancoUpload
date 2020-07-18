import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction | null> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    let findCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!findCategory) {
      findCategory = categoryRepository.create({ title: category });

      await categoryRepository.save(findCategory);
    }
    // return findCategory || null;

    const balance = (await transactionRepository.getBalance()).total;

    if (type === 'outcome' && balance < value) {
      throw new AppError('Unsufficient funds!');
    }

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category: findCategory,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
