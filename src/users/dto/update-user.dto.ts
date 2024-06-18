import { IsString, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../entities/users.enitity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
