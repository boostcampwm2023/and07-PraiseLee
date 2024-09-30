import { Test, TestingModule } from '@nestjs/testing';
import { SpacesControllerV2 } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { ProfileSpaceService } from '../profile-space/profile-space.service';
import { UploadService } from '../upload/upload.service';
import { ProfilesService } from '../profiles/profiles.service';
import { Profile, Space } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSpaceRequestV2Dto } from './dto/update-space.dto';
import { CreateSpaceRequestV2Dto } from './dto/create-space.dto';
import { RequestWithUser } from '../utils/interface';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('SpacesControllerV2', () => {
  let controller: SpacesControllerV2;
  let spacesService: SpacesService;
  let uploadService: UploadService;
  let profilesService: ProfilesService;
  let configService: ConfigService;
  let profileSpaceService: ProfileSpaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [SpacesControllerV2],
      providers: [
        {
          provide: SpacesService,
          useValue: {
            createSpace: jest.fn(),
            findSpace: jest.fn(),
            updateSpace: jest.fn(),
          },
        },
        { provide: UploadService, useValue: { uploadFile: jest.fn() } },
        {
          provide: ProfileSpaceService,
          useValue: {
            findProfileSpaceByBothUuid: jest.fn(),
            joinSpace: jest.fn(),
          },
        },
        {
          provide: ProfilesService,
          useValue: {
            findProfile: jest.fn(),
            findProfileByProfileUuid: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SpacesControllerV2>(SpacesControllerV2);
    spacesService = module.get<SpacesService>(SpacesService);
    uploadService = module.get<UploadService>(UploadService);
    profilesService = module.get<ProfilesService>(ProfilesService);
    configService = module.get<ConfigService>(ConfigService);
    profileSpaceService = module.get<ProfileSpaceService>(ProfileSpaceService);
  });

  it('create created', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const iconUrlMock = 'www.test.com/image';
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const bodyMock = {
      name: 'new space name',
      profileUuid: profileMock.uuid,
    } as CreateSpaceRequestV2Dto;
    const spaceMock = { uuid: 'space uuid' } as Space;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest.spyOn(uploadService, 'uploadFile').mockResolvedValue(iconUrlMock);
    jest.spyOn(spacesService, 'createSpace').mockResolvedValue(spaceMock);

    const response = controller.create(iconMock, bodyMock, requestMock);

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.CREATED,
      message: 'Created',
      data: spaceMock,
    });
    expect(uploadService.uploadFile).toHaveBeenCalled();
    expect(spacesService.createSpace).toHaveBeenCalledWith({
      name: bodyMock.name,
      profileUuid: bodyMock.profileUuid,
      icon: iconUrlMock,
    });
  });

  it('create not found profile', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const bodyMock = {
      name: 'new space name',
      profileUuid: 'wrong profile uuid',
    } as CreateSpaceRequestV2Dto;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(null);

    const response = controller.create(iconMock, bodyMock, requestMock);

    await expect(response).rejects.toThrow(NotFoundException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.createSpace).not.toHaveBeenCalled();
  });

  it("create profile user doesn't have", async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: 'wrong user uuid',
    } as Profile;
    const bodyMock = {
      name: 'new space name',
      profileUuid: profileMock.uuid,
    } as CreateSpaceRequestV2Dto;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);

    const response = controller.create(iconMock, bodyMock, requestMock);

    await expect(response).rejects.toThrow(ForbiddenException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.createSpace).not.toHaveBeenCalledWith();
  });

  it('create icon not requested', async () => {
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const bodyMock = {
      name: 'new space name',
      profileUuid: profileMock.uuid,
    } as CreateSpaceRequestV2Dto;
    const spaceMock = { uuid: 'space uuid' } as Space;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest.spyOn(spacesService, 'createSpace').mockResolvedValue(spaceMock);

    const response = controller.create(
      null as unknown as Express.Multer.File,
      bodyMock,
      requestMock,
    );

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.CREATED,
      message: 'Created',
      data: spaceMock,
    });
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.createSpace).toHaveBeenCalledWith({
      name: bodyMock.name,
      profileUuid: bodyMock.profileUuid,
      icon: configService.get<string>('APP_ICON_URL'),
    });
  });

  it('findOne found space', async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const profileSpaceMock = {
      spaceUuid: spaceMock.uuid,
      profileUuid: profileMock.uuid,
    };

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest.spyOn(spacesService, 'findSpace').mockResolvedValue(spaceMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(profileSpaceMock);

    const response = controller.findOne(
      spaceMock.uuid,
      profileMock.uuid,
      requestMock,
    );

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.OK,
      message: 'OK',
      data: spaceMock,
    });
  });

  it('findOne profile_uuid missing', async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;

    const response = controller.findOne(spaceMock.uuid, undefined, requestMock);

    await expect(response).rejects.toThrow(BadRequestException);
    expect(profilesService.findProfileByProfileUuid).not.toHaveBeenCalled();
  });

  it("findOne profile user doesn't have", async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: 'wrong user uuid',
    } as Profile;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);

    const response = controller.findOne(
      spaceMock.uuid,
      profileMock.uuid,
      requestMock,
    );

    await expect(response).rejects.toThrow(ForbiddenException);
    expect(spacesService.findSpace).not.toHaveBeenCalled();
  });

  it('findOne profile not joined space', async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest.spyOn(spacesService, 'findSpace').mockResolvedValue(spaceMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(null);

    const response = controller.findOne(
      spaceMock.uuid,
      profileMock.uuid,
      requestMock,
    );

    await expect(response).rejects.toThrow(ForbiddenException);
  });

  it('findOne not found space', async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest.spyOn(spacesService, 'findSpace').mockResolvedValue(null);

    const response = controller.findOne(
      spaceMock.uuid,
      profileMock.uuid,
      requestMock,
    );

    await expect(response).rejects.toThrow(NotFoundException);
  });

  it('findOne profile not found', async () => {
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(null);

    const response = controller.findOne(
      spaceMock.uuid,
      profileMock.uuid,
      requestMock,
    );

    await expect(response).rejects.toThrow(NotFoundException);
  });

  it('update update space', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const iconUrlMock = 'www.test.com/image';
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const bodyMock = { name: 'new space name' } as UpdateSpaceRequestV2Dto;
    const profileSpaceMock = {
      spaceUuid: spaceMock.uuid,
      profileUuid: profileMock.uuid,
    };

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(profileSpaceMock);
    jest.spyOn(uploadService, 'uploadFile').mockResolvedValue(iconUrlMock);
    jest.spyOn(spacesService, 'updateSpace').mockResolvedValue(spaceMock);

    const response = controller.update(
      iconMock,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.OK,
      message: 'OK',
      data: spaceMock,
    });
    expect(uploadService.uploadFile).toHaveBeenCalled();
    expect(spacesService.updateSpace).toHaveBeenCalledWith(spaceMock.uuid, {
      name: bodyMock.name,
      icon: iconUrlMock,
    });
  });

  it('update icon not requested', async () => {
    const bodyMock = { name: 'new space name' } as UpdateSpaceRequestV2Dto;
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const profileSpaceMock = {
      spaceUuid: spaceMock.uuid,
      profileUuid: profileMock.uuid,
    };

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(profileSpaceMock);
    jest.spyOn(spacesService, 'updateSpace').mockResolvedValue(spaceMock);

    const response = controller.update(
      null as unknown as Express.Multer.File,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.OK,
      message: 'OK',
      data: spaceMock,
    });
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.updateSpace).toHaveBeenCalledWith(spaceMock.uuid, {
      name: bodyMock.name,
    });
  });

  it('update name not requested', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const iconUrlMock = 'www.test.com/image';
    const bodyMock = {} as UpdateSpaceRequestV2Dto;
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const profileSpaceMock = {
      spaceUuid: spaceMock.uuid,
      profileUuid: profileMock.uuid,
    };

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(profileSpaceMock);
    jest.spyOn(spacesService, 'updateSpace').mockResolvedValue(spaceMock);
    jest.spyOn(uploadService, 'uploadFile').mockResolvedValue(iconUrlMock);

    const response = controller.update(
      iconMock,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).resolves.toEqual({
      statusCode: HttpStatus.OK,
      message: 'OK',
      data: spaceMock,
    });
    expect(uploadService.uploadFile).toHaveBeenCalled();
    expect(spacesService.updateSpace).toHaveBeenCalledWith(spaceMock.uuid, {
      icon: iconUrlMock,
    });
  });

  it("update profile user doesn't have", async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: 'new user uuid',
    } as Profile;
    const bodyMock = { name: 'new space name' } as UpdateSpaceRequestV2Dto;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);

    const response = controller.update(
      iconMock,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).rejects.toThrow(ForbiddenException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.updateSpace).not.toHaveBeenCalled();
  });

  it('update profile not joined space', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const bodyMock = { name: 'new space name' } as UpdateSpaceRequestV2Dto;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(profileMock);
    jest
      .spyOn(profileSpaceService, 'findProfileSpaceByBothUuid')
      .mockResolvedValue(null);

    const response = controller.update(
      iconMock,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).rejects.toThrow(ForbiddenException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.updateSpace).not.toHaveBeenCalled();
  });

  it('update profile not found', async () => {
    const iconMock = { filename: 'icon' } as Express.Multer.File;
    const spaceMock = { uuid: 'space uuid' } as Space;
    const requestMock = { user: { uuid: 'user uuid' } } as RequestWithUser;
    const profileMock = {
      uuid: 'profile uuid',
      userUuid: requestMock.user.uuid,
    } as Profile;
    const bodyMock = { name: 'new space name' } as UpdateSpaceRequestV2Dto;

    jest
      .spyOn(profilesService, 'findProfileByProfileUuid')
      .mockResolvedValue(null);

    const response = controller.update(
      iconMock,
      spaceMock.uuid,
      profileMock.uuid,
      bodyMock,
      requestMock,
    );

    await expect(response).rejects.toThrow(NotFoundException);
    expect(uploadService.uploadFile).not.toHaveBeenCalled();
    expect(spacesService.updateSpace).not.toHaveBeenCalled();
  });
});
