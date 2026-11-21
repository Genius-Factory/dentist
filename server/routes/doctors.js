const { serviceImage } = require('../lib/serviceImage');
const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');
const router = express.Router();
const staff = ['admin', 'superadmin', 'secretary'];
const manage = ['admin', 'superadmin'];
router.use(authenticate, syncUser);
const err = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[0-9a-f-]{36}$/i.test(String(id || ''));
const imageUrl = (value) => { const url=String(value||'').trim(); if(!url)return ''; if(url.startsWith('data:'))return serviceImage(url); try { const parsed=new URL(url); if(!['http:','https:'].includes(parsed.protocol))throw new Error(); return url; } catch { throw err(400,'Profile image must be a valid HTTP or HTTPS URL'); } };
const profile = row => ({ id: row.id, userId: row.user_id, firstName: row.first_name, lastName: row.last_name, email: row.email, phone: row.phone, profileImageUrl: row.profile_image_url, licenseNumber: row.license_number, licenseJurisdiction: row.license_jurisdiction, specialtyId: row.specialty_id, specialty: row.specialty_name, yearsOfExperience: row.years_of_experience, bio: row.bio, status: row.status, serviceIds: row.service_ids || [], services: row.services || [], clinics: row.clinics || [], createdAt: row.created_at, updatedAt: row.updated_at });
const select = `SELECT d.*, s.name specialty_name, COALESCE(json_agg(DISTINCT jsonb_build_object('id',c.id,'name',c.name,'timezone',c.timezone)) FILTER (WHERE c.id IS NOT NULL),'[]') clinics, COALESCE((SELECT json_agg(json_build_object('id',sv.id,'name',sv.name,'category',sv.category)) FROM services sv WHERE d.service_ids ? sv.id),'[]') services FROM doctors d LEFT JOIN specialties s ON s.id=d.specialty_id LEFT JOIN doctor_clinics dc ON dc.doctor_id=d.id LEFT JOIN clinics c ON c.id=dc.clinic_id`;
router.get('/specialties', requireRole(...staff), async (req,res)=>{ const r=await db.query('SELECT id,name,description FROM specialties WHERE active=true ORDER BY name'); res.json(r.rows); });
router.get('/', requireRole(...staff), async (req,res)=>{
 const page=Math.max(1,Math.min(10000,Number(req.query.page)||1)), limit=Math.max(1,Math.min(100,Number(req.query.limit)||20)), values=[], where=[];
 const add=(v)=>{values.push(v);return `$${values.length}`};
 if(req.query.search){const p=add(`%${String(req.query.search).slice(0,120)}%`);where.push(`(d.first_name ILIKE ${p} OR d.last_name ILIKE ${p} OR d.license_number ILIKE ${p} OR s.name ILIKE ${p})`);}
 if(req.query.specialtyId)where.push(`d.specialty_id=${add(req.query.specialtyId)}::uuid`);
 if(req.query.clinicId)where.push(`EXISTS(SELECT 1 FROM doctor_clinics f WHERE f.doctor_id=d.id AND f.clinic_id=${add(req.query.clinicId)}::uuid)`);
 if(req.query.status)where.push(`d.status=${add(req.query.status)}`);
 const clause=where.length?` WHERE ${where.join(' AND ')}`:'';
 const count=await db.query(`SELECT count(DISTINCT d.id)::int total,count(DISTINCT d.id) FILTER(WHERE d.status='active')::int active FROM doctors d LEFT JOIN specialties s ON s.id=d.specialty_id${clause}`,values);
 const rows=await db.query(`${select}${clause} GROUP BY d.id,s.name ORDER BY d.last_name,d.first_name LIMIT ${add(limit)} OFFSET ${add((page-1)*limit)}`,values);
 res.json({items:rows.rows.map(profile),pagination:{page,limit,total:count.rows[0].total,totalPages:Math.ceil(count.rows[0].total/limit)},stats:{total:count.rows[0].total,active:count.rows[0].active}});
});
router.get('/:id/appointments', requireRole(...staff), async(req,res)=>{ if(!validId(req.params.id))throw err(400,'Invalid doctor ID'); const r=await db.query(`SELECT a.id,a.appointment_date date,a.appointment_time time,a.duration,a.status,a.name patient_name,a.user_id FROM appointments a JOIN doctor_clinics dc ON dc.doctor_id=a.doctor_id WHERE a.doctor_id=$1 ORDER BY a.appointment_date DESC,a.appointment_time DESC LIMIT 200`,[req.params.id]);res.json(r.rows); });
router.get('/:id/availability', requireRole(...staff), async(req,res)=>{ if(!validId(req.params.id))throw err(400,'Invalid doctor ID'); const r=await db.query('SELECT id,clinic_id,weekday,start_time,end_time FROM doctor_availability WHERE doctor_id=$1 ORDER BY clinic_id,weekday,start_time',[req.params.id]);res.json(r.rows); });
router.put('/:id/availability', requireRole(...manage), async(req,res)=>{
 if(!validId(req.params.id)||!Array.isArray(req.body.intervals))throw err(400,'A valid doctor ID and intervals array are required');
 const items=req.body.intervals; if(items.length>100)throw err(400,'Too many availability intervals');
 for(const x of items){if(!validId(x.clinicId)||!Number.isInteger(Number(x.weekday))||Number(x.weekday)<0||Number(x.weekday)>6||!/^\d{2}:\d{2}$/.test(x.startTime)||!/^\d{2}:\d{2}$/.test(x.endTime)||x.startTime>=x.endTime)throw err(400,'Invalid availability interval');}
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(a.clinicId===b.clinicId&&Number(a.weekday)===Number(b.weekday)&&a.startTime<b.endTime&&b.startTime<a.endTime)throw err(409,'Availability intervals cannot overlap');}
 const client=await db.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM doctors WHERE id=$1 FOR UPDATE',[req.params.id]);await client.query('DELETE FROM doctor_availability WHERE doctor_id=$1',[req.params.id]);for(const x of items){const assignment=await client.query('SELECT 1 FROM doctor_clinics WHERE doctor_id=$1 AND clinic_id=$2',[req.params.id,x.clinicId]);if(!assignment.rowCount)throw err(400,'Doctor must be assigned to each clinic');await client.query('INSERT INTO doctor_availability(doctor_id,clinic_id,weekday,start_time,end_time) VALUES($1,$2,$3,$4,$5)',[req.params.id,x.clinicId,x.weekday,x.startTime,x.endTime]);}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}const r=await db.query('SELECT id,clinic_id,weekday,start_time,end_time FROM doctor_availability WHERE doctor_id=$1 ORDER BY clinic_id,weekday,start_time',[req.params.id]);res.json(r.rows);
});
router.get('/:id', requireRole(...staff), async(req,res)=>{if(!validId(req.params.id))throw err(400,'Invalid doctor ID');const r=await db.query(`${select} WHERE d.id=$1 GROUP BY d.id,s.name`,[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Doctor not found'});res.json(profile(r.rows[0]));});
router.post('/', requireRole(...staff), async(req,res)=>{
 const b=req.body; if(!String(b.firstName||'').trim()||!String(b.lastName||'').trim()||!String(b.licenseNumber||'').trim())throw err(400,'First name, last name, and license number are required');
 const clinics=Array.isArray(b.clinicIds)?[...new Set(b.clinicIds.filter(validId))]:[];if(!clinics.length)clinics.push('00000000-0000-4000-8000-000000000001');
 const serviceIds=[...new Set(Array.isArray(b.serviceIds)?b.serviceIds.map(String).slice(0,100):[])];
 const id=randomUUID(),client=await db.connect();try{await client.query('BEGIN');if(serviceIds.length){const found=await client.query('SELECT id FROM services WHERE id=ANY($1::varchar[]) AND status=$2',[serviceIds,'active']);if(found.rowCount!==serviceIds.length)throw err(400,'Choose valid active services');}const d=await client.query(`INSERT INTO doctors(id,user_id,first_name,last_name,email,phone,profile_image_url,license_number,license_jurisdiction,specialty_id,years_of_experience,bio,status,service_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,[id,b.userId||null,String(b.firstName).trim(),String(b.lastName).trim(),b.email||null,b.phone||null,imageUrl(b.profileImageUrl),String(b.licenseNumber).trim(),String(b.licenseJurisdiction||'default').trim(),b.specialtyId||null,Math.max(0,Number(b.yearsOfExperience)||0),String(b.bio||'').slice(0,5000),b.status==='inactive'?'inactive':'active',JSON.stringify(serviceIds)]);for(const clinic of clinics)await client.query('INSERT INTO doctor_clinics(doctor_id,clinic_id) VALUES($1,$2)',[d.rows[0].id,clinic]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');if(e.code==='23505')throw err(409,'A doctor with this license or user account already exists');throw e;}finally{client.release();}const r=await db.query(`${select} WHERE d.id=$1 GROUP BY d.id,s.name`,[id]);res.status(201).json(profile(r.rows[0]));
});
router.patch('/:id/status',requireRole(...staff),async(req,res)=>{if(!['active','inactive'].includes(req.body.status))throw err(400,'Status must be active or inactive');const r=await db.query('UPDATE doctors SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status',[req.body.status,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Doctor not found'});res.json(r.rows[0]);});
router.patch('/:id',requireRole(...staff),async(req,res)=>{const allowed={firstName:'first_name',lastName:'last_name',email:'email',phone:'phone',profileImageUrl:'profile_image_url',licenseNumber:'license_number',licenseJurisdiction:'license_jurisdiction',specialtyId:'specialty_id',yearsOfExperience:'years_of_experience',bio:'bio',status:'status'};const sets=[],values=[];for(const [key,col]of Object.entries(allowed))if(Object.hasOwn(req.body,key)){values.push(key === 'profileImageUrl' ? imageUrl(req.body[key]) : req.body[key]);sets.push(`${col}=$${values.length}`);}if(Object.hasOwn(req.body,'serviceIds')){const serviceIds=[...new Set((Array.isArray(req.body.serviceIds)?req.body.serviceIds:[]).map(String).slice(0,100))];if(serviceIds.length){const found=await db.query("SELECT id FROM services WHERE id=ANY($1::varchar[]) AND status='active'",[serviceIds]);if(found.rowCount!==serviceIds.length)throw err(400,'Choose valid active services');}values.push(JSON.stringify(serviceIds));sets.push(`service_ids=$${values.length}::jsonb`);}if(!sets.length)return res.status(400).json({error:'No supported fields supplied'});values.push(req.params.id);try{const r=await db.query(`UPDATE doctors SET ${sets.join(',')},updated_at=NOW() WHERE id=$${values.length} RETURNING id`,values);if(!r.rowCount)return res.status(404).json({error:'Doctor not found'});}catch(e){if(e.code==='23505')throw err(409,'A doctor with this license or user account already exists');throw e;}res.json(profile((await db.query(`${select} WHERE d.id=$1 GROUP BY d.id,s.name`,[req.params.id])).rows[0]));});
router.delete('/:id', requireRole(...staff), async (req, res) => {
  if (!validId(req.params.id)) throw err(400, 'Invalid doctor ID');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT user_id FROM doctors WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!result.rowCount) throw err(404, 'Doctor not found');
    const userId = result.rows[0].user_id;
    const bookings = await client.query('SELECT 1 FROM appointments WHERE doctor_id=$1 OR dentist_id=$2 LIMIT 1', [req.params.id, userId]);
    if (bookings.rowCount) throw err(409, 'This doctor has appointment history. Deactivate the profile to remove it from booking.');
    if (userId) await client.query('DELETE FROM service_dentists WHERE dentist_id=$1', [userId]);
    await client.query('DELETE FROM doctors WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
});
module.exports=router;
