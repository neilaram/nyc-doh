-- This file creates tables with statistical information about inspections.

-- Days between inspections based on inspection grade and type.
-- This table answers the question "If my restaurants last grade was <G>
-- and inspection type was <T>, how long on average until I'm inspected again"
DROP TABLE IF EXISTS Days_Between_Inspections_By_Grade;
CREATE TABLE Days_Between_Inspections_By_Grade AS
SELECT 
  prev_grade as Grade,
  p_type as Type, 
  ROUND(AVG(days_since), 2) as Avg_days
FROM inspections
WHERE prev_grade IN ("A", "B", "C")
GROUP BY prev_grade, p_type
ORDER BY Grade;

DROP TABLE IF EXISTS Inspections_By_Day_Of_Week;
CREATE TABLE Inspections_By_Day_Of_Week AS
SELECT
  case cast (strftime('%w', date) as integer)
  when 0 then 'Sunday'
  when 1 then 'Monday'
  when 2 then 'Tuesday'
  when 3 then 'Wednesday'
  when 4 then 'Thursday'
  when 5 then 'Friday'
  else 'Saturday' end as Day,
  ROUND(100.00 * COUNT(1) / (SELECT COUNT(1) FROM inspections), 2) as Percent
  FROM inspections
  GROUP BY Day;

DROP TABLE IF EXISTS Days_Between_Inspections_By_Borough;
CREATE TABLE Days_Between_Inspections_By_Borough AS
SELECT 
  i.prev_grade as Grade,
  i.p_type as Type,
  r.boro as Borough,
  ROUND(AVG(i.days_since), 2) as Avg_days
FROM inspections i
JOIN restaurants r USING (camis)
WHERE i.days_since != 0 AND i.prev_grade IN ("A", "B", "C") AND r.boro != "0" AND i.p_type IN ("cycle_initial", "cycle_reinspect")
GROUP BY i.prev_grade, i.p_type, r.boro
ORDER BY Grade, Type, Borough;
