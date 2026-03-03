import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './sync.processor';
import { QueuesService } from './queues.service';
import { SyncBootstrapService } from './sync-bootstrap.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sync',
    }),
  ],
  providers: [SyncProcessor, QueuesService, SyncBootstrapService],
  exports: [BullModule, QueuesService, SyncProcessor],
})
export class QueuesModule {}
