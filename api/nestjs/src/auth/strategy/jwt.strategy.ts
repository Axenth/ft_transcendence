import { ForbiddenException, ImATeapotException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { User } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private prisma: PrismaService)
    {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.ACCESS_TOKEN_SECRET,
            passReqToCallback: true,
        })
    }

    async validate(req: Request, payload: any)
    {
      //console.log(req.url);
        try
        {
          const user: User = await this.prisma.user.findUnique({
              where: {
                  id: payload.sub,
              },
          });
          if (user)
          {
            if (user.isNickSet === false && req.url !== '/user/setnick' && req.url!== '/user/changeavatar' && req.url !== '/user/removeavatar')
            {
              throw new HttpException('nickname not set', 318);
              //throw new ImATeapotException('nickname not set');
            }
            else if (user.isNickSet === true && payload.auth === false && req.url !== '/auth/submit2fa' && req.url !== '/auth/send2facode')
            {
              throw new HttpException('2fa required', 318);
              //throw new ImATeapotException('2fa required');
            }
            else
            {
              return (payload);
            }
          }
          else
          {
            throw new ForbiddenException('user does not exist');
          }
        }
        catch(error)
        {
          //console.log('Error in validate():');
          //console.log(error);
          throw error;
        }
    }
}