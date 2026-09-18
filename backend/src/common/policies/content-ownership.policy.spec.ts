import { Permission } from '../constants/permissions';
import { Role } from '../enums/role.enum';
import { assertCanModifyContent } from './content-ownership.policy';

const own = Permission.POST_UPDATE_OWN;
const any = Permission.POST_UPDATE_ANY;

describe('assertCanModifyContent', () => {
  it('allows roles holding the any-permission', () => {
    expect(() =>
      assertCanModifyContent({ id: 'a', role: Role.ADMIN }, 'b', own, any),
    ).not.toThrow();
  });

  it('allows staff on their own content only', () => {
    const staff = { id: 'a', role: Role.STAFF };
    expect(() => assertCanModifyContent(staff, 'a', own, any)).not.toThrow();
    expect(() => assertCanModifyContent(staff, 'b', own, any)).toThrow();
    expect(() => assertCanModifyContent(staff, null, own, any)).toThrow();
  });

  it('rejects customers', () => {
    expect(() => assertCanModifyContent({ id: 'a', role: Role.CUSTOMER }, 'a', own, any)).toThrow();
  });
});
