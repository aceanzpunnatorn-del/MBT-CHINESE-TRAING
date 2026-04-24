-- Enterprise hardening contract for leaderboard, review queue, and analytics.
-- Apply through Supabase SQL editor or migration tooling in a controlled rollout.

alter table if exists public.daily_scores
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists session_seconds integer not null default 0,
  add column if not exists correct_answers integer not null default 0,
  add column if not exists wrong_answers integer not null default 0,
  add column if not exists cards_completed integer not null default 0;

alter table if exists public.review_queue
  add column if not exists learning_mode text;

alter table if exists public.daily_scores
  add constraint daily_scores_session_seconds_nonnegative check (session_seconds >= 0) not valid;

alter table if exists public.daily_scores
  add constraint daily_scores_correct_answers_nonnegative check (correct_answers >= 0) not valid;

alter table if exists public.daily_scores
  add constraint daily_scores_wrong_answers_nonnegative check (wrong_answers >= 0) not valid;

alter table if exists public.daily_scores
  add constraint daily_scores_cards_completed_nonnegative check (cards_completed >= 0) not valid;

alter table if exists public.user_word_stats
  add constraint user_word_stats_correct_count_nonnegative check (correct_count >= 0) not valid;

alter table if exists public.user_word_stats
  add constraint user_word_stats_wrong_count_nonnegative check (wrong_count >= 0) not valid;

alter table if exists public.user_word_stats
  add constraint user_word_stats_interval_days_nonnegative check (interval_days >= 0) not valid;

create unique index if not exists daily_scores_user_mode_date_uidx
  on public.daily_scores (user_id, mode, score_date)
  where user_id is not null;

create index if not exists daily_scores_mode_score_date_idx
  on public.daily_scores (mode, score_date desc);

create unique index if not exists review_queue_user_card_learning_mode_uidx
  on public.review_queue (user_id, card_id, learning_mode)
  where learning_mode is not null;

create index if not exists review_queue_user_learning_mode_priority_idx
  on public.review_queue (user_id, learning_mode, priority desc, next_review_at asc);

create index if not exists user_word_stats_user_learning_mode_vocab_idx
  on public.user_word_stats (user_id, learning_mode, vocab_set);

create index if not exists user_word_stats_user_due_idx
  on public.user_word_stats (user_id, next_review_at);
