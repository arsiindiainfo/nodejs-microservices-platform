import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  DuplicateEmailException,
  LoginDto,
  RegisterDto,
  UserNotFoundException,
} from '@app/common';
import type { UserProfile } from '@app/common';
import { User, UserDocument, UserStatus } from './schemas/user.schema';

const BCRYPT_ROUNDS = 10;

/**
 * The only writer of `users` (§6.2) — auth-service never sees a password
 * hash, even to verify a login; it asks this service to do the compare and
 * gets back a plain UserProfile or a 401.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfile> {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new DuplicateEmailException(dto.email);
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const created = await this.userModel.create({
      name: dto.name,
      email,
      passwordHash,
    });
    return this.toProfile(created);
  }

  async verifyCredentials(dto: LoginDto): Promise<UserProfile> {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .exec();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account has been disabled.');
    }
    return this.toProfile(user);
  }

  async findById(userId: string): Promise<UserProfile> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UserNotFoundException(userId);
    }
    return this.toProfile(user);
  }

  private toProfile(user: UserDocument): UserProfile {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
    };
  }
}
