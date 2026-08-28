import { Role } from '../constants/role.enum';

export interface JwtPayload {
  sub: string; // user id (user-service Mongo _id)
  email: string;
  role: Role;
}

export interface AuthenticatedUser extends JwtPayload {}
