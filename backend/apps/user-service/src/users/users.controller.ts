import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  LoginDto,
  Public,
  RegisterDto,
  RpcExceptionFilter,
  USER_PATTERNS,
  UserIdDto,
  validateDto,
} from '@app/common';
import type { TcpEnvelope, UserProfile } from '@app/common';
import { UsersService } from './users.service';

@UseFilters(RpcExceptionFilter)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @MessagePattern(USER_PATTERNS.REGISTER)
  async register(
    @Payload() envelope: TcpEnvelope<RegisterDto>,
  ): Promise<UserProfile> {
    const dto = await validateDto(RegisterDto, envelope.data);
    return this.usersService.register(dto);
  }

  @Public()
  @MessagePattern(USER_PATTERNS.VERIFY_CREDENTIALS)
  async verifyCredentials(
    @Payload() envelope: TcpEnvelope<LoginDto>,
  ): Promise<UserProfile> {
    const dto = await validateDto(LoginDto, envelope.data);
    return this.usersService.verifyCredentials(dto);
  }

  @MessagePattern(USER_PATTERNS.FIND_BY_ID)
  async findById(
    @Payload() envelope: TcpEnvelope<UserIdDto>,
  ): Promise<UserProfile> {
    const dto = await validateDto(UserIdDto, envelope.data);
    return this.usersService.findById(dto.userId);
  }
}
