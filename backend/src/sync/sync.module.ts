import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

import { DataModule } from '../data/data.module';
import { SizingModule } from '../sizing/sizing.module';

@Module({
  imports: [DataModule, SizingModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
