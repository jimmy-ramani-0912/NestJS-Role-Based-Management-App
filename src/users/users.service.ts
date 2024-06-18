import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users, UserRole } from './entities/users.enitity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private userRepository: Repository<Users>,
  ) {}

  async create(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<Users> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, user: Partial<Users>): Promise<void> {
    const result = await this.userRepository.update(id, user);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
  }

  async findAll(): Promise<Users[]> {
    return this.userRepository.find();
  }

  async findOne(username: string): Promise<Users | undefined> {
    return this.userRepository.findOne({ where: { username } });
  }
}
