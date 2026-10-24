import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
describe('SMTP acceptance', () => {
  const sendMail = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });
  function service() {
    return new EmailService(
      new ConfigService({ SMTP_HOST: 'smtp.example.test', SMTP_FROM: 'pos@example.test' }),
    );
  }
  it('does not report success if the provider rejects any recipient', async () => {
    sendMail.mockResolvedValue({ accepted: [], rejected: ['a@example.test'] });
    await expect(
      service().send({ to: 'a@example.test', subject: 'Report', html: 'Report' }),
    ).rejects.toThrow();
  });
  it('passes real attachments through and accepts successful SMTP handoff', async () => {
    sendMail.mockResolvedValue({ accepted: ['a@example.test'], rejected: [] });
    await service().send({
      to: 'a@example.test',
      subject: 'Report',
      attachments: [
        { filename: 'report.pdf', content: Buffer.from('%PDF-'), contentType: 'application/pdf' },
      ],
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          { filename: 'report.pdf', content: expect.any(Buffer), contentType: 'application/pdf' },
        ],
      }),
    );
  });
});
