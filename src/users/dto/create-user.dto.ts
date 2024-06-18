import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../entities/users.enitity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
