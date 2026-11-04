-- =====================================================================
-- ÉCLATS NÉON — classement en ligne (Supabase)
--
-- À faire une seule fois, puis à REFAIRE quand le jeu ajoute un mode au
-- classement (c'est le cas avec Boss Rush et Chaos) :
--   1. Dans Supabase, ouvre ton projet, puis "SQL Editor" (menu de gauche).
--   2. Colle tout ce fichier, puis clique sur "Run".
--   3. Ça doit afficher "Success. No rows returned".
-- On peut le relancer sans risque : rien n'est effacé, les scores déjà
-- enregistrés sont gardés.
--
-- Modes du classement : normal, daily (défi du jour), timeattack (60 s),
-- bossrush (Boss Rush) et chaos (Chaos).
--
-- Pour modérer (pseudo méchant, score truqué) : "Table Editor", table
-- "joueurs". Supprimer une ligne efface le joueur et tous ses scores.
-- On peut aussi corriger son pseudo directement dans la case.
--
-- Sécurité : personne ne peut lire ou modifier les tables directement.
-- Le jeu passe seulement par les 3 fonctions en bas du fichier, qui
-- vérifient tout (pseudo, mode, score). Un score n'est jamais baissé.
-- =====================================================================

-- Les joueurs : un identifiant secret (créé par le téléphone) et un pseudo
create table if not exists public.joueurs (
  id uuid primary key,
  pseudo text not null,
  cree_le timestamptz not null default now()
);

-- Deux joueurs ne peuvent pas avoir le même pseudo (majuscules comprises)
create unique index if not exists joueurs_pseudo_unique on public.joueurs (lower(pseudo));

-- Le meilleur score de chaque joueur, pour chaque mode
-- (et pour chaque jour dans le défi du jour)
create table if not exists public.scores (
  joueur uuid not null references public.joueurs (id) on delete cascade,
  mode text not null,
  jour text not null default '', -- date du défi du jour (AAAA-MM-JJ), vide pour les autres modes
  score integer not null check (score > 0 and score <= 10000000),
  le timestamptz not null default now(),
  primary key (joueur, mode, jour)
);

-- Liste des modes acceptés. Refaite à chaque exécution : une base créée avec
-- l'ancienne liste (3 modes) accepte alors aussi Boss Rush et Chaos.
alter table public.scores drop constraint if exists scores_mode_check;
alter table public.scores add constraint scores_mode_check
  check (mode in ('normal', 'daily', 'timeattack', 'bossrush', 'chaos'));

create index if not exists scores_classement on public.scores (mode, jour, score desc, le);

-- Aucune règle d'accès : les tables sont fermées au public
alter table public.joueurs enable row level security;
alter table public.scores enable row level security;
revoke all on public.joueurs, public.scores from anon, authenticated;

-- ---------------------------------------------------------------------
-- Vérifie un pseudo : 2 à 16 caractères, lettres (accents compris),
-- chiffres, espace, point, tiret et tiret bas
-- ---------------------------------------------------------------------
create or replace function public.pseudo_valide(p_pseudo text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := btrim(regexp_replace(coalesce(p_pseudo, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < 2 or char_length(v) > 16 or v !~ '^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]+$' then
    raise exception 'pseudo_invalide';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- Choisir ou changer son pseudo
-- ---------------------------------------------------------------------
create or replace function public.choisir_pseudo(p_joueur uuid, p_pseudo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := public.pseudo_valide(p_pseudo);
begin
  if p_joueur is null then
    raise exception 'joueur_invalide';
  end if;
  if exists (select 1 from joueurs where lower(pseudo) = lower(v) and id <> p_joueur) then
    raise exception 'pseudo_pris';
  end if;
  insert into joueurs (id, pseudo) values (p_joueur, v)
  on conflict (id) do update set pseudo = excluded.pseudo;
  return v;
exception
  when unique_violation then
    raise exception 'pseudo_pris';
end;
$$;

-- ---------------------------------------------------------------------
-- Envoyer un score (garde seulement le meilleur) et renvoyer sa place
-- ---------------------------------------------------------------------
create or replace function public.envoyer_score(
  p_joueur uuid,
  p_pseudo text,
  p_mode text,
  p_jour text,
  p_score integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jour text := '';
  v_score integer;
  v_le timestamptz;
  v_rang integer;
  v_total integer;
begin
  if p_joueur is null then
    raise exception 'joueur_invalide';
  end if;
  if p_mode is null or p_mode not in ('normal', 'daily', 'timeattack', 'bossrush', 'chaos') then
    raise exception 'mode_invalide';
  end if;
  if p_score is null or p_score <= 0 or p_score > 10000000 then
    raise exception 'score_invalide';
  end if;
  if p_mode = 'daily' then
    -- Seulement le défi d'aujourd'hui (un jour d'écart permis pour les fuseaux horaires)
    if coalesce(p_jour, '') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'jour_invalide';
    end if;
    if abs(p_jour::date - current_date) > 1 then
      raise exception 'jour_invalide';
    end if;
    v_jour := p_jour;
  end if;

  -- Joueur inconnu (première partie) : on l'enregistre avec son pseudo
  if not exists (select 1 from joueurs where id = p_joueur) then
    perform public.choisir_pseudo(p_joueur, p_pseudo);
  end if;

  insert into scores (joueur, mode, jour, score) values (p_joueur, p_mode, v_jour, p_score)
  on conflict (joueur, mode, jour) do update
    set score = excluded.score, le = now()
    where scores.score < excluded.score;

  select s.score, s.le into v_score, v_le
  from scores s
  where s.joueur = p_joueur and s.mode = p_mode and s.jour = v_jour;

  select count(*) + 1 into v_rang
  from scores s
  where s.mode = p_mode and s.jour = v_jour
    and (s.score > v_score or (s.score = v_score and s.le < v_le));

  select count(*) into v_total
  from scores s
  where s.mode = p_mode and s.jour = v_jour;

  return json_build_object('rang', v_rang, 'total', v_total, 'meilleur', v_score);
end;
$$;

-- ---------------------------------------------------------------------
-- Lire le classement : les premiers, plus la ligne du joueur s'il est plus bas
-- ---------------------------------------------------------------------
create or replace function public.voir_classement(
  p_mode text,
  p_jour text default '',
  p_joueur uuid default null,
  p_nombre integer default 20
)
returns table (rang bigint, pseudo text, score integer, moi boolean, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with tri as (
    select
      row_number() over (order by s.score desc, s.le asc) as r,
      j.pseudo as nom,
      s.score as pts,
      coalesce(s.joueur = p_joueur, false) as est_moi,
      count(*) over () as nb
    from scores s
    join joueurs j on j.id = s.joueur
    where s.mode = p_mode
      and s.jour = case when p_mode = 'daily' then coalesce(p_jour, '') else '' end
  )
  select t.r, t.nom, t.pts, t.est_moi, t.nb
  from tri t
  where t.r <= least(greatest(coalesce(p_nombre, 20), 1), 100) or t.est_moi
  order by t.r;
$$;

-- ---------------------------------------------------------------------
-- Droits : le jeu (clé publique) peut seulement appeler ces 3 fonctions
-- ---------------------------------------------------------------------
revoke all on function public.pseudo_valide(text) from public, anon, authenticated;
revoke all on function public.choisir_pseudo(uuid, text) from public;
revoke all on function public.envoyer_score(uuid, text, text, text, integer) from public;
revoke all on function public.voir_classement(text, text, uuid, integer) from public;
grant usage on schema public to anon, authenticated;
grant execute on function public.choisir_pseudo(uuid, text) to anon, authenticated;
grant execute on function public.envoyer_score(uuid, text, text, text, integer) to anon, authenticated;
grant execute on function public.voir_classement(text, text, uuid, integer) to anon, authenticated;
