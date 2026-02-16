import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttleConfig: ThrottlerModuleOptions = [
  {
    name: 'short',
    ttl: 1000,
    limit: 20,
  },
  {
    name: 'medium',
    ttl: 10000,
    limit: 100,
  },
  {
    name: 'long',
    ttl: 60000,
    limit: 300,
  },
];

export const authThrottleConfig = {
  ttl: 60000,
  limit: 5,
};
