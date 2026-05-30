function buildOptionalRelation(id, name) {
  if (!id) {
    return null;
  }

  return {
    id,
    name: name || null,
  };
}

function buildAuthenticatedUserProfile(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department || null,
    supervisor: buildOptionalRelation(user.supervisor_id, user.supervisor_name),
    co_supervisor: buildOptionalRelation(user.co_supervisor_id, user.co_supervisor_name),
  };
}

module.exports = {
  buildAuthenticatedUserProfile,
};