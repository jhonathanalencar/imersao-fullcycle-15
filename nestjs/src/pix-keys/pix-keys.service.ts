import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientGrpc } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';

import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { PixKey, PixKeyKind } from './entities/pix-key.entity';
import { BankAccount } from '../bank-accounts/entities/bank-account.entity';

import { PixKeyClientGrpc, RegisterPixKeyRpcResponse } from './pix-keys.grpc';

@Injectable()
export class PixKeysService implements OnModuleInit {
  private pixGrpcService: PixKeyClientGrpc;

  constructor(
    @InjectRepository(PixKey)
    private pixKeyRepository: Repository<PixKey>,
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
    @Inject('PIX_PACKAGE')
    private pixGrpcPackage: ClientGrpc,
  ) {}

  onModuleInit() {
    this.pixGrpcService = this.pixGrpcPackage.getService('PixService');
  }

  async create(bankAccountId: string, createPixKeyDto: CreatePixKeyDto) {
    await this.bankAccountRepository.findOneOrFail({
      where: { id: bankAccountId },
    });

    const remotePixKey = await this.findRemotePixKey(createPixKeyDto);

    if (remotePixKey) {
      return this.createIfNotExists(bankAccountId, remotePixKey);
    } else {
      const createdRemotePixKey = await lastValueFrom(
        this.pixGrpcService.registerPixKey({
          ...createPixKeyDto,
          accountId: bankAccountId,
        }),
      );

      return this.pixKeyRepository.save({
        id: createdRemotePixKey.id,
        bank_account_id: bankAccountId,
        ...createPixKeyDto,
      });
    }
  }

  private async findRemotePixKey(data: {
    key: string;
    kind: string;
  }): Promise<RegisterPixKeyRpcResponse | null> {
    try {
      return await lastValueFrom(this.pixGrpcService.find(data));
    } catch (e) {
      console.error(e);

      if (e.details == 'no key was found') {
        return null;
      }

      throw new PixKeyGrpcUnknownError('Grpc Internal Error');
    }
  }

  private async createIfNotExists(
    bankAccountId: string,
    remotePixKey: RegisterPixKeyRpcResponse,
  ) {
    const hasLocalPixKey = await this.pixKeyRepository.exist({
      where: {
        key: remotePixKey.key,
      },
    });

    if (hasLocalPixKey) {
      throw new PixKeyAlreadyExistsError('Pix Key already exists');
    } else {
      return this.pixKeyRepository.save({
        id: remotePixKey.id,
        bank_account_id: bankAccountId,
        key: remotePixKey.key,
        kind: remotePixKey.kind as PixKeyKind,
      });
    }
  }

  findAll(bankAccountId: string) {
    return this.pixKeyRepository.find({
      where: { bank_account_id: bankAccountId },
      order: { created_at: 'DESC' },
    });
  }
}

export class PixKeyGrpcUnknownError extends Error {}

export class PixKeyAlreadyExistsError extends Error {}
