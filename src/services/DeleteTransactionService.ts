import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: RequestDTO): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const deleteTransaction = await transactionRepository.findOne({
      where: { id },
    });

    if (!deleteTransaction) {
      throw new AppError('Transaction not found! Check your id, please!');
    }

    await transactionRepository.delete({ id });
  }
}

export default DeleteTransactionService;
