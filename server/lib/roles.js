const VALID_ROLES = ['superadmin', 'admin', 'secretary', 'member'];
const ROLE_RANK = { member: 0, secretary: 1, admin: 2, superadmin: 3 };

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return VALID_ROLES.includes(value) ? value : 'member';
}

function canManageUser(actorRole, targetRole) {
  return ROLE_RANK[normalizeRole(actorRole)] > ROLE_RANK[normalizeRole(targetRole)];
}

function canAssignRole(actorRole, role) {
  return ROLE_RANK[normalizeRole(actorRole)] > ROLE_RANK[normalizeRole(role)];
}

module.exports = { VALID_ROLES, normalizeRole, canManageUser, canAssignRole };
