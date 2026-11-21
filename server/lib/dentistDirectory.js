/* Linked accounts keep their booking ID so existing appointments still block their slots. */
const directory = `
  SELECT COALESCE(d.user_id, d.id::text) AS id, d.id AS doctor_id, d.user_id,
    concat_ws(' ', d.first_name, d.last_name) AS name, sp.name AS specialty,
    d.bio, d.years_of_experience AS "yearsOfExperience", d.profile_image_url AS "profileImageUrl",
    d.service_ids
  FROM doctors d LEFT JOIN specialties sp ON sp.id = d.specialty_id WHERE d.status = 'active'`;

const patientFields = 'p.id, p.name, p.specialty, p.bio, p."yearsOfExperience", p."profileImageUrl"';
module.exports = { directory, patientFields };
