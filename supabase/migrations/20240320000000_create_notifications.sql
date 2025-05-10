-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can mark their notifications as read" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;

-- Create policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their notifications as read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- Create indexes
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- Enable realtime for notifications table
alter publication supabase_realtime add table notifications; 