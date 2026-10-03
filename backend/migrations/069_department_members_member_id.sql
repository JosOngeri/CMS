-- 069_department_members_member_id.sql
-- department_community.routes /join writes department_members.member_id
-- (link to the members record); the column was never ported from prod.

ALTER TABLE department_members
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
