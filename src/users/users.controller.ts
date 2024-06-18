import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Get,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Users, UserRole } from './entities/users.enitity';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      console.log('jjjjjjjjjjjjjjjjjjj');

      return await this.userService.create(
        createUserDto.username,
        createUserDto.password,
        createUserDto.role,
      );
    } catch (error) {
      console.log(error);
      throw new ForbiddenException('No access to create user.');
    }
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      await this.userService.update(id, updateUserDto);
      return { message: 'User updated successfully.' };
    } catch (error) {
      throw new ForbiddenException('No access to update user.');
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async delete(@Param('id') id: string) {
    try {
      await this.userService.delete(id);
      return { message: 'User deleted successfully.' };
    } catch (error) {
      throw new ForbiddenException('No access to delete user.');
    }
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findAll() {
    return this.userService.findAll();
  }
}
