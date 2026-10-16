import { TRANSFER_STATUS_TO_DB } from './notifications.gateway';

describe('NotificationsGateway transfer status vocabulary', () => {
  it('emits the DB/REST status names the web client switches on', () => {
    expect(TRANSFER_STATUS_TO_DB.requested).toBe('pending');
    expect(TRANSFER_STATUS_TO_DB.shipped).toBe('in_transit');
    expect(TRANSFER_STATUS_TO_DB.approved).toBe('approved');
    expect(TRANSFER_STATUS_TO_DB.received).toBe('received');
    expect(TRANSFER_STATUS_TO_DB.rejected).toBe('rejected');
    expect(TRANSFER_STATUS_TO_DB.cancelled).toBe('cancelled');
  });
});
