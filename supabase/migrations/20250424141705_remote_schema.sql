create type "public"."service_status" as enum ('draft', 'published', 'archived', 'suspended');

create type "public"."user_role" as enum ('customer', 'service_owner', 'halal_reviewer', 'admin');

create table "public"."bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "bookmarkable_id" uuid not null,
    "bookmarkable_type" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."bookmarks" enable row level security;

create table "public"."categories" (
    "category_id" uuid not null default gen_random_uuid(),
    "name_en" text not null,
    "name_de" text,
    "name_ar" text
);


alter table "public"."categories" enable row level security;

create table "public"."offers" (
    "id" uuid not null default gen_random_uuid(),
    "service_id" uuid not null,
    "title" text not null,
    "description" text,
    "price" numeric(10,2),
    "image_urls" text[] default '{}'::text[],
    "status" service_status default 'draft'::service_status,
    "view_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."offers" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "avatar_url" text,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "role" user_role not null default 'customer'::user_role,
    "about" text
);


alter table "public"."profiles" enable row level security;

create table "public"."souks" (
    "souk_id" uuid not null default gen_random_uuid(),
    "souk_owner_id" uuid not null,
    "souk_name" text not null,
    "souk_description" text,
    "souk_logo" jsonb,
    "is_verified" boolean default false,
    "verified_at" timestamp with time zone,
    "verified_by" uuid,
    "souk_view_count" integer default 0,
    "purchase_count" integer default 0,
    "category_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "contact_email" text,
    "contact_phone" text,
    "social_instagram" text,
    "social_website" text,
    "address_street" character varying(255) not null,
    "address_zip" character varying(20) not null,
    "address_country" character varying(100) not null,
    "location_latitude" numeric(10,8),
    "location_longitude" numeric(11,8),
    "souk_status" service_status,
    "review_feedback" text,
    "souk_images" text,
    "address_city" text,
    "opening_hours" text,
    "bookmarks_id" uuid
);


alter table "public"."souks" enable row level security;

create table "public"."views" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "viewable_id" uuid not null,
    "viewable_type" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."views" enable row level security;

CREATE UNIQUE INDEX bookmarks_pkey ON public.bookmarks USING btree (id);

CREATE UNIQUE INDEX businesses_pkey ON public.souks USING btree (souk_id);

CREATE UNIQUE INDEX categories_name_en_key ON public.categories USING btree (name_en);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (category_id);

CREATE INDEX idx_bookmarks_bookmarkable ON public.bookmarks USING btree (bookmarkable_id, bookmarkable_type);

CREATE INDEX idx_category_id ON public.categories USING btree (category_id);

CREATE INDEX idx_services_category ON public.souks USING btree (category_id);

CREATE INDEX idx_services_owner ON public.souks USING btree (souk_owner_id);

CREATE INDEX idx_services_verification ON public.souks USING btree (is_verified);

CREATE UNIQUE INDEX idx_unique_bookmark ON public.bookmarks USING btree (user_id, bookmarkable_id, bookmarkable_type);

CREATE INDEX idx_views_viewable ON public.views USING btree (viewable_id, viewable_type);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX services_pkey ON public.offers USING btree (id);

CREATE UNIQUE INDEX views_pkey ON public.views USING btree (id);

alter table "public"."bookmarks" add constraint "bookmarks_pkey" PRIMARY KEY using index "bookmarks_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."offers" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."souks" add constraint "businesses_pkey" PRIMARY KEY using index "businesses_pkey";

alter table "public"."views" add constraint "views_pkey" PRIMARY KEY using index "views_pkey";

alter table "public"."bookmarks" add constraint "bookmarks_bookmarkable_type_check" CHECK ((bookmarkable_type = ANY (ARRAY['business'::text, 'service'::text]))) not valid;

alter table "public"."bookmarks" validate constraint "bookmarks_bookmarkable_type_check";

alter table "public"."bookmarks" add constraint "bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bookmarks" validate constraint "bookmarks_user_id_fkey";

alter table "public"."categories" add constraint "categories_name_en_key" UNIQUE using index "categories_name_en_key";

alter table "public"."offers" add constraint "services_business_id_fkey" FOREIGN KEY (service_id) REFERENCES souks(souk_id) ON DELETE CASCADE not valid;

alter table "public"."offers" validate constraint "services_business_id_fkey";

alter table "public"."profiles" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "users_id_fkey";

alter table "public"."souks" add constraint "businesses_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users(id) not valid;

alter table "public"."souks" validate constraint "businesses_verified_by_fkey";

alter table "public"."souks" add constraint "services_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(category_id) not valid;

alter table "public"."souks" validate constraint "services_category_id_fkey";

alter table "public"."souks" add constraint "services_service_owner_id_fkey" FOREIGN KEY (souk_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."souks" validate constraint "services_service_owner_id_fkey";

alter table "public"."souks" add constraint "services_service_owner_id_fkey1" FOREIGN KEY (souk_owner_id) REFERENCES profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."souks" validate constraint "services_service_owner_id_fkey1";

alter table "public"."souks" add constraint "services_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES profiles(id) not valid;

alter table "public"."souks" validate constraint "services_verified_by_fkey";

alter table "public"."souks" add constraint "souks_bookmarks_id_fkey" FOREIGN KEY (bookmarks_id) REFERENCES bookmarks(id) ON DELETE CASCADE not valid;

alter table "public"."souks" validate constraint "souks_bookmarks_id_fkey";

alter table "public"."views" add constraint "views_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."views" validate constraint "views_user_id_fkey";

alter table "public"."views" add constraint "views_viewable_type_check" CHECK ((viewable_type = ANY (ARRAY['business'::text, 'service'::text]))) not valid;

alter table "public"."views" validate constraint "views_viewable_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_current_timestamp()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
  BEGIN
    RETURN NOW();
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_business_view_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE businesses
  SET view_count = view_count + 1
  WHERE id = NEW.viewable_id AND NEW.viewable_type = 'business';
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_service_view_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE services
  SET view_count = view_count + 1
  WHERE id = NEW.viewable_id AND NEW.viewable_type = 'service';
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."bookmarks" to "anon";

grant insert on table "public"."bookmarks" to "anon";

grant references on table "public"."bookmarks" to "anon";

grant select on table "public"."bookmarks" to "anon";

grant trigger on table "public"."bookmarks" to "anon";

grant truncate on table "public"."bookmarks" to "anon";

grant update on table "public"."bookmarks" to "anon";

grant delete on table "public"."bookmarks" to "authenticated";

grant insert on table "public"."bookmarks" to "authenticated";

grant references on table "public"."bookmarks" to "authenticated";

grant select on table "public"."bookmarks" to "authenticated";

grant trigger on table "public"."bookmarks" to "authenticated";

grant truncate on table "public"."bookmarks" to "authenticated";

grant update on table "public"."bookmarks" to "authenticated";

grant delete on table "public"."bookmarks" to "service_role";

grant insert on table "public"."bookmarks" to "service_role";

grant references on table "public"."bookmarks" to "service_role";

grant select on table "public"."bookmarks" to "service_role";

grant trigger on table "public"."bookmarks" to "service_role";

grant truncate on table "public"."bookmarks" to "service_role";

grant update on table "public"."bookmarks" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."offers" to "anon";

grant insert on table "public"."offers" to "anon";

grant references on table "public"."offers" to "anon";

grant select on table "public"."offers" to "anon";

grant trigger on table "public"."offers" to "anon";

grant truncate on table "public"."offers" to "anon";

grant update on table "public"."offers" to "anon";

grant delete on table "public"."offers" to "authenticated";

grant insert on table "public"."offers" to "authenticated";

grant references on table "public"."offers" to "authenticated";

grant select on table "public"."offers" to "authenticated";

grant trigger on table "public"."offers" to "authenticated";

grant truncate on table "public"."offers" to "authenticated";

grant update on table "public"."offers" to "authenticated";

grant delete on table "public"."offers" to "service_role";

grant insert on table "public"."offers" to "service_role";

grant references on table "public"."offers" to "service_role";

grant select on table "public"."offers" to "service_role";

grant trigger on table "public"."offers" to "service_role";

grant truncate on table "public"."offers" to "service_role";

grant update on table "public"."offers" to "service_role";

grant select on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."souks" to "anon";

grant insert on table "public"."souks" to "anon";

grant references on table "public"."souks" to "anon";

grant select on table "public"."souks" to "anon";

grant trigger on table "public"."souks" to "anon";

grant truncate on table "public"."souks" to "anon";

grant update on table "public"."souks" to "anon";

grant delete on table "public"."souks" to "authenticated";

grant insert on table "public"."souks" to "authenticated";

grant references on table "public"."souks" to "authenticated";

grant select on table "public"."souks" to "authenticated";

grant trigger on table "public"."souks" to "authenticated";

grant truncate on table "public"."souks" to "authenticated";

grant update on table "public"."souks" to "authenticated";

grant delete on table "public"."souks" to "service_role";

grant insert on table "public"."souks" to "service_role";

grant references on table "public"."souks" to "service_role";

grant select on table "public"."souks" to "service_role";

grant trigger on table "public"."souks" to "service_role";

grant truncate on table "public"."souks" to "service_role";

grant update on table "public"."souks" to "service_role";

grant delete on table "public"."views" to "anon";

grant insert on table "public"."views" to "anon";

grant references on table "public"."views" to "anon";

grant select on table "public"."views" to "anon";

grant trigger on table "public"."views" to "anon";

grant truncate on table "public"."views" to "anon";

grant update on table "public"."views" to "anon";

grant delete on table "public"."views" to "authenticated";

grant insert on table "public"."views" to "authenticated";

grant references on table "public"."views" to "authenticated";

grant select on table "public"."views" to "authenticated";

grant trigger on table "public"."views" to "authenticated";

grant truncate on table "public"."views" to "authenticated";

grant update on table "public"."views" to "authenticated";

grant delete on table "public"."views" to "service_role";

grant insert on table "public"."views" to "service_role";

grant references on table "public"."views" to "service_role";

grant select on table "public"."views" to "service_role";

grant trigger on table "public"."views" to "service_role";

grant truncate on table "public"."views" to "service_role";

grant update on table "public"."views" to "service_role";

create policy "Users can create their own bookmarks"
on "public"."bookmarks"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own bookmarks"
on "public"."bookmarks"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can view their own bookmarks"
on "public"."bookmarks"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Enable read access for all users"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "Everyone can view published offers"
on "public"."offers"
as permissive
for select
to public
using ((status = 'published'::service_status));


create policy "Service owners can create offers for their services"
on "public"."offers"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM souks
  WHERE ((souks.souk_id = offers.service_id) AND (souks.souk_owner_id = auth.uid())))));


create policy "Service owners can delete their offers"
on "public"."offers"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM souks
  WHERE ((souks.souk_id = offers.service_id) AND (souks.souk_owner_id = auth.uid())))));


create policy "Service owners can update their offers"
on "public"."offers"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM souks
  WHERE ((souks.souk_id = offers.service_id) AND (souks.souk_owner_id = auth.uid())))));


create policy "Service owners can view all their offers"
on "public"."offers"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM souks
  WHERE ((souks.souk_id = offers.service_id) AND (souks.souk_owner_id = auth.uid())))));


create policy "Block all anon updates"
on "public"."profiles"
as restrictive
for update
to public
using ((auth.uid() IS NOT NULL))
with check ((auth.uid() IS NOT NULL));


create policy "Only authenticated users can insert profiles"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() IS NOT NULL));


create policy "Prevent anonymous profile updates"
on "public"."profiles"
as restrictive
for update
to public
using ((auth.role() <> 'anon'::text))
with check ((auth.role() <> 'anon'::text));


create policy "Prevent profile deletion"
on "public"."profiles"
as permissive
for delete
to public
using (false);


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using (((auth.uid() IS NOT NULL) AND (auth.uid() = id)));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using (((auth.uid() = id) OR (auth.uid() IS NULL)));


create policy "Only service owners and admins can create services"
on "public"."souks"
as permissive
for insert
to public
with check (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['service_owner'::user_role, 'admin'::user_role])))))));


create policy "Service owners can delete their own services"
on "public"."souks"
as permissive
for delete
to public
using ((auth.uid() = souk_owner_id));


create policy "Service owners can set themselves as owners"
on "public"."souks"
as permissive
for insert
to public
with check ((auth.uid() = souk_owner_id));


create policy "Service owners can update their own services"
on "public"."souks"
as permissive
for update
to public
using ((auth.uid() = souk_owner_id));


create policy "Services are viewable by everyone"
on "public"."souks"
as permissive
for select
to public
using (true);


create policy "Anyone can create views"
on "public"."views"
as permissive
for insert
to public
with check ((auth.uid() IS NOT NULL));


create policy "Business owners can see views of their businesses"
on "public"."views"
as permissive
for select
to public
using (((viewable_type = 'business'::text) AND (EXISTS ( SELECT 1
   FROM souks
  WHERE ((souks.souk_id = views.viewable_id) AND (souks.souk_owner_id = auth.uid()))))));


create policy "Business owners can see views of their services"
on "public"."views"
as permissive
for select
to public
using (((viewable_type = 'service'::text) AND (EXISTS ( SELECT 1
   FROM (offers
     JOIN souks ON ((offers.service_id = souks.souk_id)))
  WHERE ((offers.id = views.viewable_id) AND (souks.souk_owner_id = auth.uid()))))));


create policy "Users can see their own views"
on "public"."views"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER after_view_insert_business AFTER INSERT ON public.views FOR EACH ROW WHEN ((new.viewable_type = 'business'::text)) EXECUTE FUNCTION increment_business_view_count();

CREATE TRIGGER after_view_insert_service AFTER INSERT ON public.views FOR EACH ROW WHEN ((new.viewable_type = 'service'::text)) EXECUTE FUNCTION increment_service_view_count();


