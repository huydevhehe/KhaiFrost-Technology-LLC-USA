import { PasswordHasher } from './password-hasher.service';
import { generateTemporaryPassword } from './temporary-password';
import { evaluatePasswordPolicy } from '../policies/password.policy';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('produces argon2id hashes with the configured cost and verifies them', async () => {
    const hash = await hasher.hash('Sup3r-Secret-Value');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(await hasher.verify(hash, 'Sup3r-Secret-Value')).toBe(true);
    expect(await hasher.verify(hash, 'wrong')).toBe(false);
    expect(hasher.needsRehash(hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hasher.hash('same-input-1A')).not.toBe(await hasher.hash('same-input-1A'));
  });

  it('treats malformed hashes and the unusable marker as a failed verification', async () => {
    expect(await hasher.verify('not-a-hash', 'x')).toBe(false);
    expect(await hasher.verify(hasher.unusableHash(), 'x')).toBe(false);
  });

  it('flags hashes made with weaker parameters for an upgrade', async () => {
    const argon2 = await import('argon2');
    const weak = await argon2.hash('pw', { memoryCost: 4096, timeCost: 2, parallelism: 1 });
    expect(hasher.needsRehash(weak)).toBe(true);
  });

  it('can burn the same time for unknown identifiers', async () => {
    await expect(hasher.verifyAgainstDummy('anything')).resolves.toBeUndefined();
  });
});

describe('generateTemporaryPassword', () => {
  it('always satisfies the password policy and is unique', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 200; index++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(16);
      expect(evaluatePasswordPolicy(password)).toEqual([]);
      seen.add(password);
    }
    expect(seen.size).toBe(200);
  });
});
