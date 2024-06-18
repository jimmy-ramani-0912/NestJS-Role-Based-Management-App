import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/entities/users.enitity';

@Injectable()
export class SeedService {
  constructor(private usersService: UsersService) {}

  async seed() {
    const username = 'superadmin';
    const password = 'superadmin';
    const role = UserRole.SUPERADMIN;

    const existingUser = await this.usersService.findOne(username);
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.usersService.create(username, hashedPassword, role);
    }
  }
}
