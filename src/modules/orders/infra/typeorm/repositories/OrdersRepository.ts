import { getRepository, Repository, getManager } from 'typeorm';

import IOrdersRepository from '@modules/orders/repositories/IOrdersRepository';
import ICreateOrderDTO from '@modules/orders/dtos/ICreateOrderDTO';
import OrdersProducts from '@modules/orders/infra/typeorm/entities/OrdersProducts';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../entities/Order';

class OrdersRepository implements IOrdersRepository {
  private ormRepository: Repository<Order>;

  private ormOrderProductsRepository: Repository<OrdersProducts>;

  constructor() {
    this.ormRepository = getRepository(Order);
    this.ormOrderProductsRepository = getRepository(OrdersProducts);
  }

  public async create({ customer, products }: ICreateOrderDTO): Promise<Order> {
    const order = this.ormRepository.create({
      customer,
    });

    const orderProducts: OrdersProducts[] = [];

    products.forEach(async ({ product_id, price, quantity }) => {
      const orderProduct = this.ormOrderProductsRepository.create({
        product_id,
        price,
        quantity,
      });

      orderProducts.push(orderProduct);

      await getManager().decrement(
        Product,
        { id: product_id },
        'quantity',
        quantity,
      );
    });

    order.order_products = orderProducts;

    const orderSaved = await this.ormRepository.save(order);

    return orderSaved;
  }

  public async findById(id: string): Promise<Order | undefined> {
    const product = await this.ormRepository.findOne(id, {
      relations: ['customer', 'order_products'],
    });

    return product;
  }
}

export default OrdersRepository;
