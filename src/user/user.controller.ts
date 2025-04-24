import { Body, Controller, Post, Req } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';
import { CreateAdminDto } from './dtos/create-admin.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('admin-ignup')
  async adminSignup(@Body() request: CreateAdminDto) {
    return this.userService.adminSignup(request);
  }

  @Post('signup')
  async signup(@Body() request: CreateUserDto) {
    return this.userService.signup(request);
  }

  @Post('login')
  async login(@Body() request: CreateUserDto) {
    return this.userService.login(request);
  }
}
