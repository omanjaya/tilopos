import { ConfigService } from '@nestjs/config';
import { ElasticsearchTransport } from './elasticsearch-transport';
import { resolveElasticsearchAuth } from './elk-logger.service';

describe('ElasticsearchTransport', () => {
  let transport: ElasticsearchTransport;

  afterEach(() => transport?.close());

  it('caps the buffer while Elasticsearch is unreachable (drops oldest)', () => {
    transport = new ElasticsearchTransport({
      elasticsearchUrl: 'http://127.0.0.1:1',
      indexPrefix: 'test',
      batchSize: 1000,
      maxBufferSize: 5,
      flushInterval: 60_000,
    });
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    for (let i = 0; i < 20; i++)
      transport.log({ level: 'info', message: `m${i}` }, () => undefined);
    const buffer = (transport as unknown as { buffer: Array<{ message: string }> }).buffer;
    expect(buffer.map((e) => e.message)).toEqual(['m15', 'm16', 'm17', 'm18', 'm19']);
    stderr.mockRestore();
  });

  it('reads credentials embedded in the URL', () => {
    expect(ElasticsearchTransport.authFromUrl('http://u%40x:p@es:9200')).toEqual({
      username: 'u@x',
      password: 'p',
    });
    expect(ElasticsearchTransport.authFromUrl('http://es:9200')).toBeUndefined();
  });
});

describe('resolveElasticsearchAuth', () => {
  const cfg = (env: Record<string, string>) => new ConfigService(env);

  it('requires credentials in production', () => {
    expect(() =>
      resolveElasticsearchAuth(
        cfg({ NODE_ENV: 'production', ELASTICSEARCH_URL: 'http://es:9200' }),
      ),
    ).toThrow(/credentials/);
  });

  it('accepts username/password, api key or URL credentials', () => {
    expect(
      resolveElasticsearchAuth(cfg({ ELASTICSEARCH_USERNAME: 'u', ELASTICSEARCH_PASSWORD: 'p' })),
    ).toEqual({ username: 'u', password: 'p' });
    expect(resolveElasticsearchAuth(cfg({ ELASTICSEARCH_API_KEY: 'k' }))).toEqual({ apiKey: 'k' });
    expect(
      resolveElasticsearchAuth(
        cfg({ NODE_ENV: 'production', ELASTICSEARCH_URL: 'https://w:s@es:9200' }),
      ),
    ).toEqual({ username: 'w', password: 's' });
  });
});
