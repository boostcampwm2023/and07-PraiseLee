import {
  Controller,
  Post,
  Request,
  UseGuards,
  Get,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { KakaoUserDto } from './dto/kakao-user.dto';
import { UsersService } from 'src/users/users.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('kakao-oauth')
  async kakaoLogin(@Body() kakaoUserDto: KakaoUserDto) {
    const kakaoUserAccount = await this.authService.getKakaoAccount(
      kakaoUserDto.kakaoUserId,
    );
    if (!kakaoUserAccount) throw new NotFoundException();
    let user = await this.usersService.findOneByEmail(kakaoUserAccount.email);
    if (!user) {
      this.usersService.createOne(kakaoUserAccount.email);
      user = await this.usersService.findOneByEmail(kakaoUserAccount.email);
    }
    return this.authService.login(user);
  }

  @Post('token')
  @Public()
  renewAccessToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const refreshToken = refreshTokenDto.refresh_token;
    return this.authService.renewAccessToken(refreshToken);
  }

  @Post('logout')
  @Public()
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    const refreshToken = refreshTokenDto.refresh_token;
    return this.authService.remove(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}