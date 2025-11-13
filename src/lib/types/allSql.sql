-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_profiles (
  id uuid NOT NULL,
  username character varying NOT NULL UNIQUE,
  full_name character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.geocode_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address text NOT NULL,
  address_hash character varying NOT NULL UNIQUE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  formatted_address text,
  created_at timestamp with time zone DEFAULT now(),
  use_count integer DEFAULT 1,
  CONSTRAINT geocode_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.public_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT public_access_pkey PRIMARY KEY (id),
  CONSTRAINT public_access_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admin_profiles(id)
);
CREATE TABLE public.public_login_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  login_time timestamp with time zone DEFAULT now(),
  success boolean NOT NULL,
  user_agent text,
  CONSTRAINT public_login_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  route_name character varying NOT NULL,
  file_name character varying NOT NULL,
  file_checksum character varying NOT NULL,
  total_waypoints integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  monday boolean DEFAULT false,
  tuesday boolean DEFAULT false,
  wednesday boolean DEFAULT false,
  thursday boolean DEFAULT false,
  friday boolean DEFAULT false,
  saturday boolean DEFAULT false,
  sunday boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid,
  CONSTRAINT routes_pkey PRIMARY KEY (id),
  CONSTRAINT routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id),
  CONSTRAINT routes_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.admin_profiles(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admin_profiles(id)
);
CREATE TABLE public.vehicle_simulation_state (
  vehicle_id uuid NOT NULL,
  active_route_id uuid,
  current_latitude numeric,
  current_longitude numeric,
  current_speed numeric,
  current_bearing numeric,
  is_parked boolean DEFAULT false,
  parked_since timestamp with time zone,
  last_waypoint_id uuid,
  next_waypoint_id uuid,
  simulation_active boolean DEFAULT false,
  last_movement_time timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_simulation_state_pkey PRIMARY KEY (vehicle_id),
  CONSTRAINT vehicle_simulation_state_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id),
  CONSTRAINT vehicle_simulation_state_active_route_id_fkey FOREIGN KEY (active_route_id) REFERENCES public.routes(id),
  CONSTRAINT vehicle_simulation_state_last_waypoint_id_fkey FOREIGN KEY (last_waypoint_id) REFERENCES public.waypoints(id),
  CONSTRAINT vehicle_simulation_state_next_waypoint_id_fkey FOREIGN KEY (next_waypoint_id) REFERENCES public.waypoints(id)
);
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  vehicle_number character varying,
  vehicle_type character varying,
  color character varying DEFAULT '#000000'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);
CREATE TABLE public.waypoints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  original_address text,
  CONSTRAINT waypoints_pkey PRIMARY KEY (id),
  CONSTRAINT waypoints_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id)
);