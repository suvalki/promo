import { Schema, Document } from 'mongoose';
import {
  SyncPluginOptions,
  SyncMethodName,
  SyncMethods,
  SyncData,
} from '@/common/types/mongoose-plugin.types';

export function SyncPlugin(schema: Schema, options: SyncPluginOptions): void {
  const { queuesService, entityName } = options;
  const syncMethodName = `sync${entityName}` as SyncMethodName;
  const syncService = queuesService as SyncMethods;

  schema.post('save', function (doc: Document) {
    const data = doc.toObject() as SyncData;
    if (typeof syncService[syncMethodName] === 'function') {
      void (syncService[syncMethodName] as (data: SyncData) => Promise<void>)(
        data,
      ).catch((error) => {
        const err = error as Error;
        console.error(`Error queuing sync for ${entityName}:`, err.message);
      });
    }
  });

  schema.post('findOneAndUpdate', function (doc: Document | null) {
    if (doc) {
      const data = doc.toObject() as SyncData;
      if (typeof syncService[syncMethodName] === 'function') {
        void (syncService[syncMethodName] as (data: SyncData) => Promise<void>)(
          data,
        ).catch((error) => {
          const err = error as Error;
          console.error(`Error queuing sync for ${entityName}:`, err.message);
        });
      }
    }
  });
}
