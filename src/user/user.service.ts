import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import * as R from 'ramda';
import * as RA from 'ramda-adjunct';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashSync, compareSync } from 'bcryptjs';
import { CreateAdminDto } from './dtos/create-admin.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private readonly ADMIN_PASS;
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    this.ADMIN_PASS = configService.get('ADMIN_PASS');
  }

  async adminSignup(request: CreateAdminDto) {
    const { email, password, adminPass } = request;
    const passHash = hashSync(password, 10);

    if (R.isNil(adminPass) || adminPass !== this.ADMIN_PASS) {
      throw new UnauthorizedException('Admin singup failed!');
    }
 
    /**
     * @todo Check if email already exists.
     */
    const createdUser = new this.userModel({ email, passHash, role: UserRole.User });
    const userdDataInDb = await createdUser.save();
    const { _id: userId } = userdDataInDb;

    return { userId };
  }

  async signup(request: CreateUserDto) {
    const { email, password } = request;
    const passHash = hashSync(password, 10);

    /**
     * @todo Check if email already exists.
     */
    const createdUser = new this.userModel({ email, passHash, role: UserRole.User });
    const userdDataInDb = await createdUser.save();
    const { _id: userId } = userdDataInDb;

    return { userId };
  }

  async login(request: CreateUserDto) {
    const { email, password } = request;

    const userDataInDb = (await this.userModel
      .findOne({ email })
      .exec()) as UserDocument;

    console.log('user data in db: ', userDataInDb);

    const { _id: userId } = userDataInDb;
    const { passHash } = userDataInDb;

    if (R.isNil(userDataInDb)) {
      throw new NotFoundException('Sorry, email does not exist!');
    }

    const passwordMatch = compareSync(password, passHash);

    if (RA.isFalse(passwordMatch)) {
      throw new UnauthorizedException('Login failed!');
    }

    return { userId };
  }

  /**
   * @todo Add logout.
   */
}
