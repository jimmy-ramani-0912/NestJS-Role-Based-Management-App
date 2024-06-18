# Building a Comprehensive Role-Based User Management System with NestJS, PostgreSQL, and TypeORM

The combination of **NestJS**, **TypeORM**, and **PostgreSQL** provides a scalable and efficient stack for developing web services. This article outlines constructing a role-based authentication system with NestJS, focusing on SuperAdmin, Admin, and User roles. We will delve into the fundamentals of each element and their collaboration, guiding you through a straightforward example to kickstart your project.

## Introduction to the Stack

### NestJS

NestJS is a framework for building efficient, scalable [Node.js](https://nodejs.org/en) server-side applications. It uses progressive JavaScript, is built with and fully supports [TypeScript](https://www.typescriptlang.org/) (yet still enables developers to code in pure JavaScript) and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming).

### TypeORM

TypeORM is an [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) (Object-Relational Mapping) library that can run in Node.js and can be used with TypeScript and JavaScript (ES5+). It supports the Active Record and Data Mapper patterns, unlike all other JavaScript ORMs currently in existence, which means you can write high-quality, loosely coupled, scalable, maintainable applications most efficiently.

### PostgreSQL

PostgreSQL is a powerful, open-source object-relational database system that uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads.

## Requirements

- Node.js (version >= 16)
- npm (or Yarn)
- PostgreSQL
- (OPTIONAL) Docker and Postman

## STEP 1 : Setting Up the Project

> Create a new NestJS project

```
npm i -g @nestjs/cli nest new project-name
```

Navigate into your project directory before proceeding.

> Install TypeORM and PostgreSQL

```
npm install --save @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer
```

> Database Connection

- create an `.env` in the root of your project

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DB=role-based-rest-api
JWT_SECRET='my-secret-key'
```

- create an typeormconfig.ts file to configure TypeORM with PostgreSQL

```
import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenvConfig({ path: '.env' });

const config = {
  type: 'postgres',
  host: `${process.env.POSTGRES_HOST}`,
  port: `${process.env.POSTGRES_PORT}`,
  username: `${process.env.POSTGRES_USER}`,
  password: `${process.env.POSTGRES_PASSWORD}`,
  database: `${process.env.POSTGRES_DB}`,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: true,
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
```

- Add `app.setGlobalPrefix('api/v1');` in main.ts (OPTIONAL)

  - It adds the prefix api/v1 to every route registered in the application.
  - This means all API endpoints will be accessible under the api/v1 path.

- Add `app.enableCors();` in main.ts (OPTIONAL)

  - Allows requests from frontend applications on different domains to access the API endpoints.
  - Improves security by controlling which origins (domains or subdomains) can make requests to the API.

## STEP 2 : Integrate Config into Nestjs

- To add the typeorm.ts into the main root module, which is mostly named as app.module.ts

```
import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import typeorm from './config/typeormconfig';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    await this.seedService.seed();
  }
}
```

In the AppModule, NestJS uses ConfigModule to globally load application configurations, including TypeORM options defined in config/typeorm.ts. The TypeOrmModule.forRootAsync method fetches TypeORM configuration asynchronously via ConfigService, enabling seamless integration with the application's configuration.

## STEP 3 : Create User Entity and Roles

Create a user.entity.ts file in the user module:

```
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;
}
```

## STEP 4 : Create User Service and Controller

Implement the service and controller in the user module:

- users.service.ts

```
import { Injectable } from '@nestjs/common';
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

  async update(id: number, user: Partial<Users>): Promise<void> {
    await this.userRepository.update(id, user);
  }

  async delete(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async findAll(): Promise<Users[]> {
    return this.userRepository.find();
  }

  async findOne(username: string): Promise<Users | undefined> {
    return this.userRepository.findOne({ where: { username } });
  }
}
```

- users.controller.ts

```
import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Get,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Users, UserRole } from './entities/users.enitity';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async create(
    @Body() body: { username: string; password: string; role: UserRole },
  ) {
    console.log('Creating user:', body);

    return this.userService.create(body.username, body.password, body.role);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async update(@Param('id') id: number, @Body() body: Partial<Users>) {
    return this.userService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async delete(@Param('id') id: number) {
    return this.userService.delete(id);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  async findAll() {
    return this.userService.findAll();
  }
}
```

- users.module.ts

```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.enitity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Users])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

## STEP 5 : Setup Authentication

Implement JWT-based authentication.

- auth.module.ts

```
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategy/jwt.strategy';
import { config as dotenvConfig } from 'dotenv';
import { LocalStrategy } from './strategy/local.strategy';

dotenvConfig({ path: '.env' });

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- auth.service.ts

```
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

- auth/strategy/jwt.strategy.ts

```
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env' });
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: `${process.env.JWT_SECRET}`,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
```

- auth/strategy/local-auth.strategy.ts

```
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super(); // default strategy fields: username and password
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

- auth.controller.ts

```
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
```

- auth/guard/jwt.guard.ts

```
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- auth/guard/local-auth.guard.ts

```
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

## STEP 6 : Add Role-based Guards

Create guards to protect routes based on user roles.

- auth/guard/roles.guard.ts

```
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { UserRole } from '../../users/entities/users.enitity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
```

- auth/decorator/roles.decorator.ts

```
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/users.enitity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

## STEP 7 : Setup Seed Service

- The SeedService is a service designed to initialize the application with default data. In this case, it ensures that a default user with the role of superadmin is present in the database when the application starts. If the superadmin user does not exist, it creates this user with a predefined username and password.

- seed/seed/service.ts

```
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
```

## Test

> Login (POST /auth/login)

Request:

Method: POST
URL: http://localhost:3000/api/v1/auth/login
Headers:
Content-Type: application/json
Body (JSON):

```
{
  "username": "superadmin",
  "password": "superadmin",
}
```

> User Registration (POST /users)

Request:

Method: POST
URL: http://localhost:3000/api/v1/users
Headers:
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
(**Need Super-Admin / Admin token**)
Body (JSON):

```
{
  "username": "admin",
  "password": "password",
  "role": "admin"
}
```

> Get All Users (GET /users)

Request:

Method: GET
URL: http://localhost:3000/api/v1/users
Headers:
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
(**Need Super-Admin / Admin token**)

Response:

Status: 200 OK
Body (JSON):

```
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  {
    "id": 2,
    "username": "user1",
    "role": "user"
  },
  {
    "id": 3,
    "username": "user2",
    "role": "user"
  }
]
```

> Update User (PUT /users/:id)

Request:

Method: PUT
URL: http://localhost:3000/api/v1/users/2
Headers:
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
(**Need Super-Admin / Admin token**)

Response:

Status: 200 OK
Body (JSON):

```
{
  "role": "admin"
}
```

> Delete User (DELETE /users/:id)

Request:

Method: DELETE
URL: http://localhost:3000/api/v1/users/2
Headers:
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
(**Need Super-Admin / Admin token**)

Response:

Status: 200 OK
