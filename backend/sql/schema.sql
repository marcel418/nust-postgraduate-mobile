create extension if not exists "pgcrypto";

drop table if exists audit_logs cascade;
drop table if exists notifications cascade;
drop table if exists workflow_transitions cascade;
drop table if exists workflow_tasks cascade;
drop table if exists workflow_instances cascade;
drop table if exists submission_documents cascade;
drop table if exists documents cascade;
drop table if exists submission_versions cascade;
drop table if exists submissions cascade;
drop table if exists academic_semesters cascade;
drop table if exists user_roles cascade;
drop table if exists roles cascade;
drop table if exists users cascade;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  status text not null default 'ACTIVE',
  department varchar(255),
  supervisor_id uuid references users(id) on delete set null,
  co_supervisor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table academic_semesters (
  id serial primary key,
  label varchar(50) not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  scope_type text,
  scope_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, role_id, scope_type, scope_id)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id),
  submission_type text not null,
  title text not null,
  description text,
  semester_id integer references academic_semesters(id) on delete set null,
  due_date date,
  extended_due_date date,
  document_label varchar(100),
  current_state text not null default 'DRAFT',
  current_version_no int not null default 1,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  version_no int not null,
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  notes text,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique(submission_id, version_no)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  uploaded_by uuid references users(id),
  virus_scan_status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table submission_documents (
  id uuid primary key default gen_random_uuid(),
  submission_version_id uuid not null references submission_versions(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  document_type text not null,
  created_at timestamptz not null default now()
);

create table workflow_instances (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  current_state text not null default 'DRAFT',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  assigned_to uuid references users(id),
  assigned_role text,
  task_type text not null,
  status text not null default 'OPEN',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  from_state text,
  to_state text not null,
  action_code text not null,
  actor_id uuid references users(id),
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null default 'WORKFLOW',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table notification_schedules (
  id serial primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  trigger_type varchar(30) not null,
  sent_at timestamptz default now(),
  unique(submission_id, user_id, trigger_type)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  event text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  correlation_id text,
  created_at timestamptz not null default now()
);

insert into roles (code, name) values
('STUDENT', 'Student'),
('SUPERVISOR', 'Supervisor'),
('HOD', 'Head of Department'),
('INTERNAL_EVALUATOR', 'Internal Evaluator'),
('FPGC_R', 'FPGC-R'),
('FPGC', 'FPGC'),
('EXTERNAL_EVALUATOR', 'External Evaluator'),
('SYSTEM_ADMIN', 'System Admin');

create index idx_submissions_student_id on submissions(student_id);
create index idx_submissions_current_state on submissions(current_state);
create index idx_workflow_tasks_assigned_to on workflow_tasks(assigned_to);
create index idx_workflow_tasks_status on workflow_tasks(status);
create index idx_notifications_user_id on notifications(user_id);