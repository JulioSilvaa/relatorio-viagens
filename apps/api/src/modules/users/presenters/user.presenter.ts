import type { PersistedUser, UserView } from '../user.types.js';

export function userToView(user: PersistedUser, roleCode: string): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department,
    cargo: user.cargo,
    roleCode: roleCode as UserView['roleCode'],
    status: user.status,
  };
}
