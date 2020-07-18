import {
  getCustomRepository,
  getRepository,
  In,
  TransactionRepository,
} from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoryRepository from '../repositories/CategoryRepository';
import AppError from '../errors/AppError';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // console.log({ title, type, value, category });

      if (!title || !type || !value) return; // para que nao seja inserido em caso de dados incompletos/inexistentes

      // para nao abrir e fechar uma conexao a cada inserção no banco, usamos o codigo abaixo para so ter uma abertura e fechamento de conexao

      transactions.push({ title, type, value, category });
      categories.push(category);
    });
    await new Promise(resolve => parseCSV.on('end', resolve)); // quando for emitido, retorna tudo.

    // criar uma regra de negocio que insere varias de uma vez - metodo in

    // o In de typeorm verifica se as categorias passadas existem no banco de uma só vez! Armazenamos as existentes em uma variavel
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    // pegamos um array dos NOMES (title) das categorias já existentes encontradas, pois não precisa ser criada.
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // retorna as que não forem category existente no primeio filtro e, no resultado filtrar para tirar os valores repetidos caso tenha a mesma categoria nova duas vezes. O self é o array de categorias, identifica onde o index é igual e retira pelo filter, deixando só as que não são iguais no array final.
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories]; // todas as categorias

    const balance = (await transactionsRepository.getBalance()).total;

    const { total } = transactions.reduce(
      (accumulator, transaction) => {
        switch (transaction.type) {
          case 'income':
            accumulator.total += Number(transaction.value);
            break;
          case 'outcome':
            accumulator.total -= Number(transaction.value);
            break;
          default:
            break;
        }

        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    if (balance + total < 0) {
      throw new AppError('Unsufficient funds!');
    }

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
