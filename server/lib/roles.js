const VALID_ROLES = ['superadmin', 'admin', 'secretary', 'client'];
const ROLE_RANK = { client: 0, secretary: 1, admin: 2, superadmin: 3 };

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return value === 'member' ? 'client' : (VALID_ROLES.includes(value) ? value : 'client');
}

function canManageUser(actorRole, targetRole) {
  return ROLE_RANK[normalizeRole(actorRole)] > ROLE_RANK[normalizeRole(targetRole)];
}

function canAssignRole(actorRole, role) {
  return ROLE_RANK[normalizeRole(actorRole)] > ROLE_RANK[normalizeRole(role)];
}

module.exports = { VALID_ROLES, normalizeRole, canManageUser, canAssignRole };
