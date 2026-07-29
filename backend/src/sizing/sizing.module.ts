import { Module } from '@nestjs/common';
import { SizingController } from './sizing.controller';
import { SizingService } from './sizing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SizingController],
  providers: [SizingService],
  exports: [SizingService],
})
export class SizingModule {}
