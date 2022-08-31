import {
  ForbiddenException,
  HttpException,
  Injectable,
  Res,
  HttpStatus
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { MailService } from './../mail/mail.service';

import { tokenPairDto } from '../../types/tokenPairDto';
import { User } from '@prisma/client';


// Custom Class Validator Types
import { TwoFaDto } from '../../types/TwoFaDto.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private axios: HttpService,
    private mailer: MailService,
  ) {}

  makeid(length) {
    let result: string           = '';
    let characters: string       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength: number = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

async send2facode(id: number) {
  let user: User;
  try {
    user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    if (!user) {
      throw new ForbiddenException('user not found');
    } else {
      let lastSecret: number = Number(user.lastSecret);
      if (user.lastSecret && (Date.now() - lastSecret) < 900000)
      {
        console.log(`Code generated recently.. minutes elapsed: ${((Date.now()-lastSecret)/1000)/60}`);
      }
      else
      {
        console.log('Code not generated yet');
        const secret = this.makeid(5);
        const secretHash = await argon.hash(secret);
        console.log(
          `Generated secret for user ${user.nickname}[${id}]: ${secret}`,
        );
        await this.prisma.user.update({
          where: {
            id: id,
          },
          data: {
            secret: secretHash,
            lastSecret: Date.now(),
          },
        });
        await this.mailer.sendUserConfirmation(user.email, secret);
      }
    return ;
    }
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError)
    {
      throw new HttpException("woops", HttpStatus.BAD_REQUEST);
    }
    //console.log('\n\nError in make2fa() provider:\n\n');
    //console.log(error);
    throw error;
  }
}

  async make2fa(id: number) {
    let user: User;
    try {
      user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!user) {
        throw new ForbiddenException('user not found');
      } else if (user.twoFactorAuth === true) {
        throw new ForbiddenException('user already has 2fa');
      } else {
        let lastSecret: number = Number(user.lastSecret);
          if (user.lastSecret && (Date.now() - lastSecret) < 900000)
          {
            console.log(`Code generated recently.. minutes elapsed: ${((Date.now()-lastSecret)/1000)/60}`);
          }
          else
          {
            console.log('Code not generated yet');
            const secret = this.makeid(5);
            const secretHash = await argon.hash(secret);
            console.log(
              `Generated secret for user ${user.nickname}[${id}]: ${secret}`,
            );
            await this.prisma.user.update({
              where: {
                id: id,
              },
              data: {
                secret: secretHash,
                lastSecret: Date.now(),
              },
            });
            await this.mailer.sendUserConfirmation(user.email, secret);
          }
        return ;
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('\n\nError in make2fa() provider:\n\n');
      //console.log(error);
      throw error;
    }
  }

  async submit2fa(id: number, twofaDto: TwoFaDto) {
    let user: User;
    try {
      // Try to find user
      user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (user) {
        // User is found, verify OTP is valid
        let isValid: boolean = await argon.verify(
          `${user.secret}`,
          twofaDto.otp,
        );
        console.log(`Checking with OTP: ${twofaDto.otp}`);
        console.log(`isValid: ${isValid}\nSecret: ${twofaDto.otp} and ${user.secret}`);
        if (!isValid)
        {
          // If OTP isn't valid throw error.
          console.log('isValid is false?');
          throw new ForbiddenException('incorrect otp');
        }
        else {
          // If OTP is valid, sign new tokens with auth as true
          console.log('isValid is true.');
          const tokens: tokenPairDto = await this.signTokens(
            user.id,
            user.email,
            true,
          );
          await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
          // Update twoFactorAuth to true in case it isn't already set.
          if (user.twoFactorAuth === false) {
            user = await this.prisma.user.update({
              where: {
                id: id,
              },
              data: {
                twoFactorAuth: true,
                lastSecret: null,
              },
            });
          }
          // Return the tokens
          console.log(
            `User ${user.nickname} has 2fa set as '${user.twoFactorAuth}'`,
          );
          return {
            access_token: `${tokens.access_token}`,
            refresh_token: `${tokens.refresh_token}`,
          };
        }
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('\n\nError in submit2fa() provider:\n\n');
      //console.log(error);
      throw error;
    }
  }

  async disable2fa(id: number, twofaDto: TwoFaDto) {
    try {
      // Try to find user
      let user: User;
      user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      // only continue if user exists and if twoFactorAuth is actually set to true
      if (user && user.twoFactorAuth === true) {
        let isValid: boolean = await argon.verify(
          `${user.secret}`,
          twofaDto.otp,
        );
        console.log(`Checking with OTP: ${twofaDto.otp}`);
        console.log(`isValid: ${isValid}\nSecret: ${twofaDto.otp}`);
        // Only continue if valid
        if (isValid) {
          // Update twoFactorAuth and set secret to null
          user = await this.prisma.user.update({
            where: {
              id: id,
            },
            data: {
              twoFactorAuth: false,
              secret: null,
              lastSecret: null,
            },
          });
          // Generate token pair with auth as false
          console.log(
            `User ${user.nickname} has 2fa set as '${user.twoFactorAuth}'`,
          );
          return {};
        } else {
          throw new ForbiddenException('incorrect otp');
        }
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('\n\nError in disable2fa() provider:\n\n');
      //console.log(error);
      throw error;
    }
  }

  async logout(id: number) {
    try {
      await this.prisma.user.updateMany({
        where: {
          id: id,
          refreshTokenHash: {
            not: null,
          },
        },
        data: {
          refreshTokenHash: null,
        },
      });
      console.log('Deleted refresh token hash');
      return { statusCode: 200 };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error in logout() provider');
      throw error;
    }
  }

  async refreshTokens(
    id: number,
    refreshToken: string,
    isRefreshAuth: boolean,
  ) {
    let user: User;
    let tokens: tokenPairDto;
    let hashVerify;
    try {
      user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      // If user is not found or no refreshToken exists, throw error.
      if (!user || !user.refreshTokenHash) {
        throw new ForbiddenException('Refresh token possibly hijacked');
      } else {
        // verify if refresh token matches the one in the user's db entry
        hashVerify = await argon.verify(
          `${user.refreshTokenHash}`,
          refreshToken,
        );
        if (!hashVerify) {
          throw new ForbiddenException('Refresh token possibly hijacked');
        }
      }
      if (user) {
        // If user exists set bool for tokens..
        // Might replace this approach with another.. ->
        // Same process as setnick ->
        const isAuth = user.twoFactorAuth === false ? true : false;
        if (isAuth === false && isRefreshAuth === true) {
          tokens = await this.signTokens(user.id, user.email, true);
        } else {
          tokens = await this.signTokens(user.id, user.email, isAuth);
        }
        await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
        return tokens;
      } else {
        throw new ForbiddenException('User not found.');
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error on refreshTokens() provider:');
      //console.log(error);
      throw error;
    }
  }

  async updateRefreshTokenHash(id: number, refreshToken: string) {
    let refreshTokenHash: string;
    try {
      refreshTokenHash = await argon.hash(refreshToken);
      await this.prisma.user.update({
        where: {
          id: id,
        },
        data: {
          refreshTokenHash: refreshTokenHash,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error on updateRefreshTokenHash()');
      throw error;
    }
  }

  async signTokens(
    userId: number,
    email: string,
    isAuth: boolean,
  ): Promise<tokenPairDto> {
    // Create a payload object, sub is standard for jwt, we'll use ID, and our own claim (email)
    const payload = {
      sub: userId,
      email: email,
      auth: isAuth,
    };

    // Grab secret string from environment
    const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret: string = process.env.REFRESH_TOKEN_SECRET;

    // Generate token using our payload object through jwt.signAsync
    // Function accepts the payload object and an object with the required secret key, and the expiration time of the token
    try {
      const accessToken = await this.jwt.signAsync(payload, {
        expiresIn: '60m',
        secret: accessTokenSecret,
      });

      const refreshToken = await this.jwt.signAsync(payload, {
        expiresIn: 60 * 60 * 24 * 7 * 4,
        secret: refreshTokenSecret,
      });

      // Return as an object that contains an access_token string.
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      //console.log('Error in signTokens()');
      throw error;
    }
  }

  async callback(res: any, code: string) {
    // Setting variables according to parameters and environment variables
    const clientId: string = process.env.FORTYTWO_API_CLIENT_ID;
    const clientSecret: string = process.env.FORTYTWO_API_CLIENT_SECRET;

    // Configuration object for POST request to intra API.
    let requestConfig: any;
    let responseData: any;

    try {
      // POST request through axios.
      requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${code}`,
        },
        params: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: `${process.env.BACKEND_URL}/auth/callback`,
          state: `${process.env.STATESECRET}`,
        },
      };
      responseData = await lastValueFrom(
        this.axios
          .post('https://api.intra.42.fr/oauth/token', null, requestConfig)
          .pipe(
            map((response) => {
              return response.data;
            }),
          ),
      );

      // Logging data received from POST request
      console.log(`Received from 42 api: `);
      console.log(responseData);

      // Setting access_token string to whatever was received
      const access_token: string = responseData.access_token;
      // Setting config object with header for GET request to 42 API
      requestConfig = {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      };

      // GET request to 42 API using received access_token
      responseData = await lastValueFrom(
        this.axios.get('https://api.intra.42.fr/v2/me', requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );

      console.log(`Received from 42 API after obtaining access_token:`);
      console.log(`Email: ${responseData.email}\n`);

      // TRY to find user in database
      let user: User = await this.prisma.user.findUnique({
        where: {
          email: responseData.email,
        },
      });

      // If doesn't exist, create him.
      if (!user) {
        console.log('User didnt exit, creating him now: ');
        // Save user in db
        user = await this.prisma.user.create({
          data: {
            email: responseData.email,
            defaultAvatar: responseData.image_url,
          },
        });
      } else {
        console.log('User already existed: ');
      }
      // LOGGING user object
      console.log(user);

      // Generate the tokens
      const isAuth: boolean = user.twoFactorAuth === false ? true : false;
      const tokens: tokenPairDto = await this.signTokens(
        user.id,
        user.email,
        isAuth,
      );
      // Update refresh token hash on database for user
      await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

      res.cookie('pongJwtRefreshToken', tokens.refresh_token, {
        httpOnly: false,
        sameSite: false,
      });
      return res.redirect(`${process.env.FRONTEND_URL}/`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error on callback() provider');
      //console.log(error);
      throw error;
    }
  }
}
