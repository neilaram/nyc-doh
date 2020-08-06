-- This SQL init script assumes that there exists a csvData table which has been populated with
-- an import of the upstream DOH data. It extracts data from the csvData into a relational format consisting of
-- tables for restaurants, inspections, and violations.

-- Delete the non-health inspections...we don't care about them.
DELETE FROM csvData where
`INSPECTION TYPE` LIKE "Smoke-Free Air Act%"
OR `INSPECTION TYPE` LIKE "Trans Fat%"
OR `INSPECTION TYPE` LIKE "Calorie Posting%"
OR `INSPECTION TYPE` LIKE "Administrative Miscellaneous%";

DROP TABLE IF EXISTS restaurants;
CREATE TABLE restaurants (
  camis TEXT PRIMARY KEY,
  dba TEXT,
  boro TEXT,
  building TEXT,
  street TEXT,
  zipcode TEXT,
  cuisine TEXT,
  latitude TEXT,
  longitude TEXT,
  phone TEXT,
  -- Results of
  prev_insp TEXT,
  days_since INTEGER,
  prev_score TEXT,
  prev_grade TEXT
);

DROP TABLE IF EXISTS inspections;
CREATE TABLE inspections (
  camis TEXT,
  date TEXT,
  dba TEXT,
  type TEXT,
  score INTEGER,
  grade TEXT,
  action TEXT,
  PRIMARY KEY (camis, date)
);

CREATE INDEX inspectionsByDate on inspections(date);
CREATE INDEX inspectionsByRestaurant on inspections(dba);

DROP TABLE IF EXISTS violations;
CREATE TABLE violations (
  camis TEXT,
  date TEXT,
  dba TEXT,
  type TEXT,
  PRIMARY KEY(camis, date, type)
 );

INSERT INTO violations
  SELECT DISTINCT
  CAMIS,
  substr(`INSPECTION DATE`, 7) || "-" || substr(`INSPECTION DATE`,1,2)  || "-" || substr(`INSPECTION DATE`, 4,2),
  DBA,
  `VIOLATION DESCRIPTION`
FROM csvData;

INSERT INTO inspections
	SELECT DISTINCT
	CAMIS,
	substr(`INSPECTION DATE`, 7) || "-" || substr(`INSPECTION DATE`,1,2)  || "-" || substr(`INSPECTION DATE`, 4,2) as date,
	DBA,
	`INSPECTION TYPE`,
	CAST(SCORE AS INTEGER),
	GRADE,
	`ACTION`
FROM csvData
GROUP BY CAMIS, date;

-- Assign slightly less verbose aliases to the different inspection types.
UPDATE inspections SET type=replace( type, 'Cycle Inspection', 'cycle' ) WHERE type LIKE 'Cycle Inspection%';
UPDATE inspections SET type=replace( type, 'Pre-permit (Operational)', 'pre-op' ) WHERE type LIKE 'Pre-permit (Operational)%';
UPDATE inspections SET type=replace( type, 'Pre-permit (Non-operational)', 'pre-nonop' ) WHERE type LIKE 'Pre-permit (Non-operational)%';
UPDATE inspections SET type=replace( type, 'Initial Inspection', 'initial' ) WHERE type LIKE '%Initial Inspection';
UPDATE inspections SET type=replace( type, 'Re-inspection', 'reinspect' ) WHERE type LIKE '%Re-inspection';
UPDATE inspections SET type=replace( type, 'Reopening Inspection', 'reopen' ) WHERE type LIKE '%Reopening Inspection';
UPDATE inspections SET type=replace( type, 'Compliance Inspection', 'compliance' ) WHERE type LIKE '%/ Compliance Inspection';
UPDATE inspections SET type=replace( type, 'Second Compliance Inspection', 'compliance2' ) WHERE type LIKE '%/ Second Compliance Inspection';
UPDATE inspections SET type=replace( type, ' / ', '_' ) WHERE type LIKE '% / %';

-- Add prior inspection columns
ALTER TABLE inspections ADD prev_inspection TEXT;
ALTER TABLE inspections ADD prev_grade TEXT;
ALTER TABLE inspections ADD prev_score TEXT;
ALTER TABLE inspections add p_type TEXT;
ALTER TABLE inspections ADD days_since INTEGER;

-- Populate prior inspection data for convenienve in stats queries
UPDATE inspections SET prev_inspection=(SELECT max(i.date) from inspections i WHERE inspections.camis = i.camis AND i.date < inspections.date);
UPDATE inspections SET prev_score=(SELECT score from inspections i WHERE inspections.camis = i.camis AND i.date = inspections.prev_inspection);
UPDATE inspections SET prev_grade=(SELECT grade from inspections i WHERE inspections.camis = i.camis AND i.date = inspections.prev_inspection);
UPDATE inspections SET p_type=(SELECT type from inspections i WHERE inspections.camis = i.camis AND i.date = inspections.prev_inspection);
UPDATE inspections SET days_since=(CAST(julianday(date) - julianday(prev_inspection) AS INTEGER));


INSERT INTO restaurants SELECT DISTINCT v.CAMIS,
 v.DBA,
 v.BORO,
 v.BUILDING,
 v.STREET,
 v.ZIPCODE,
 v.`CUISINE DESCRIPTION`,
 v.Latitude,
 v.Longitude,
 v.PHONE,
 max(i.date),
 CAST(julianday('now') - julianday(max(i.date)) AS INTEGER),
 i.score,
 i.grade
from
  csvData v
LEFT JOIN inspections i ON (v.CAMIS = i.camis)
GROUP BY v.CAMIS, v.DBA;

