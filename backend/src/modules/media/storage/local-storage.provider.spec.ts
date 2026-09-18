import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { LocalStorageProvider } from './local-storage.provider';
import { buildStorageKey, createStorageKeyBase, isValidStorageKey } from './storage-key';

describe('LocalStorageProvider', () => {
  let sandbox: string;
  let uploadDir: string;
  let outsideDir: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'kf-local-storage-'));
    uploadDir = join(sandbox, 'uploads');
    outsideDir = join(sandbox, 'outside');
    provider = new LocalStorageProvider({
      uploadDir,
      publicBaseUrl: 'http://localhost:4000/uploads',
    } as never);
  });

  afterEach(() => {
    // Only the directory created by this very test run is removed
    rmSync(sandbox, { recursive: true, force: true });
  });

  it('writes, reads, checks and deletes a file inside the upload root', async () => {
    const key = '2026/09/11111111-1111-4111-8111-111111111111.webp';
    await provider.put(key, Buffer.from('hello'), 'image/webp');

    expect(await provider.exists(key)).toBe(true);
    expect((await provider.read(key)).toString()).toBe('hello');
    expect(
      existsSync(join(uploadDir, '2026', '09', '11111111-1111-4111-8111-111111111111.webp')),
    ).toBe(true);

    await provider.delete(key);
    expect(await provider.exists(key)).toBe(false);
    await expect(provider.delete(key)).resolves.toBeUndefined();
  });

  it('leaves no temporary file behind after a write', async () => {
    const key = '2026/09/22222222-2222-4222-8222-222222222222.pdf';
    await provider.put(key, Buffer.from('%PDF-'), 'application/pdf');
    expect(readdirSync(join(uploadDir, '2026', '09'))).toEqual([
      '22222222-2222-4222-8222-222222222222.pdf',
    ]);
  });

  it('cleans the temporary file when the final rename fails', async () => {
    const key = '2026/09/33333333-3333-4333-8333-333333333333.webp';
    // A directory sitting at the target path makes the rename fail
    await provider.put('2026/09/keep.webp', Buffer.from('x'), 'image/webp');
    const target = join(uploadDir, '2026', '09', '33333333-3333-4333-8333-333333333333.webp');
    mkdirSync(target);

    await expect(provider.put(key, Buffer.from('data'), 'image/webp')).rejects.toThrow();
    expect(readdirSync(join(uploadDir, '2026', '09')).filter((n) => n.endsWith('.tmp'))).toEqual(
      [],
    );
  });

  describe('path traversal', () => {
    const hostileKeys = [
      '../outside/evil.webp',
      '2026/../../outside/evil.webp',
      '/etc/passwd',
      'C:/Windows/win.ini',
      'C:\\Windows\\win.ini',
      '..\\outside\\evil.webp',
      '2026/09/../../../evil.webp',
      '2026//09/evil.webp',
      './evil.webp',
      '.hidden',
      '2026/09/evil.webp\0.png',
      '2026/09/%2e%2e/evil.webp',
      '',
      '   ',
    ];

    it.each(hostileKeys)('rejects the key %j for every operation', async (key) => {
      await expect(provider.put(key, Buffer.from('x'), 'image/webp')).rejects.toThrow();
      await expect(provider.read(key)).rejects.toThrow();
      await expect(provider.exists(key)).rejects.toThrow();
      await expect(provider.delete(key)).rejects.toThrow();
      expect(() => provider.createReadStream(key)).toThrow();
      expect(existsSync(outsideDir)).toBe(false);
    });

    it('never resolves a valid key outside the root', () => {
      const resolved = provider.resolveInsideRoot('2026/09/abc.webp');
      expect(resolved.startsWith(resolve(uploadDir))).toBe(true);
    });

    it('does not delete a file that lives outside the upload root', async () => {
      mkdirSync(outsideDir);
      const victim = join(outsideDir, 'victim.txt');
      writeFileSync(victim, 'keep me');

      await expect(provider.delete('../outside/victim.txt')).rejects.toThrow();
      expect(existsSync(victim)).toBe(true);
    });

    it('refuses to write through a symbolic link that leaves the upload root', async () => {
      mkdirSync(outsideDir);
      mkdirSync(uploadDir, { recursive: true });
      try {
        symlinkSync(outsideDir, join(uploadDir, 'linked'), 'junction');
      } catch {
        return; // Symbolic links are not permitted in this environment
      }

      await expect(
        provider.put('linked/evil.webp', Buffer.from('x'), 'image/webp'),
      ).rejects.toThrow(/outside the upload root/);
      expect(existsSync(join(outsideDir, 'evil.webp'))).toBe(false);
    });
  });

  it('builds URL-encoded public URLs', () => {
    expect(provider.toPublicUrl('2026/09/a b.webp')).toBe(
      'http://localhost:4000/uploads/2026/09/a%20b.webp',
    );
  });
});

describe('storage keys', () => {
  it('generates server side yyyy/mm/uuid keys', () => {
    const base = createStorageKeyBase(new Date(Date.UTC(2026, 8, 19)));
    expect(base).toMatch(/^2026\/09\/[0-9a-f-]{36}$/);
    expect(buildStorageKey(base, 'webp')).toBe(`${base}.webp`);
    expect(buildStorageKey(base, 'webp', 'thumb')).toBe(`${base}_thumb.webp`);
    expect(isValidStorageKey(buildStorageKey(base, 'webp', 'thumb'))).toBe(true);
  });

  it('accepts only safe key shapes', () => {
    expect(isValidStorageKey('2026/09/x.webp')).toBe(true);
    expect(isValidStorageKey('a/../b')).toBe(false);
    expect(isValidStorageKey(42)).toBe(false);
    expect(isValidStorageKey('x'.repeat(301))).toBe(false);
  });
});
