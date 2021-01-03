import { inject, injectable } from 'tsyringe';
import { classToClass } from 'class-transformer';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import ICreateOrderDTO from '../dtos/ICreateOrderDTO';

interface IProductRequest {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProductRequest[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const productsKeys = products.map(product => {
      return { id: product.id };
    });

    const productsFounds = await this.productsRepository.findAllById(
      productsKeys,
    );

    if (productsFounds.length !== products.length) {
      throw new AppError('One or more products not found');
    }

    const productsWithPrice = products.map(product => {
      const productFound = productsFounds.find(
        productDb => productDb.id === product.id,
      );

      if (!productFound) {
        throw new AppError('Um dos produtos não foi encontrado');
      }

      if (productFound.quantity - product.quantity < 0) {
        throw new AppError('Um dos produtos está sem estoque');
      }

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: productFound.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsWithPrice,
    } as ICreateOrderDTO);

    return classToClass(order);
  }
}

export default CreateOrderService;
