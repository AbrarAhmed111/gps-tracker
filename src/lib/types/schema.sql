-- ═══════════════════════════════════════════════════════════════════════════
-- GPS SIMULATION DASHBOARD - SIMPLIFIED CORE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 1: admin_profiles
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ NULL
);

CREATE INDEX idx_admin_profiles_username ON admin_profiles(username);

COMMENT ON TABLE admin_profiles IS 'Admin user profiles linked to Supabase Auth';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 2: public_access
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public_access IS 'Single shared password for public dashboard access';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 3: public_login_logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    user_agent TEXT NULL
);

CREATE INDEX idx_public_login_logs_ip ON public_login_logs(ip_address);
CREATE INDEX idx_public_login_logs_time ON public_login_logs(login_time DESC);

COMMENT ON TABLE public_login_logs IS 'Track public user login attempts only';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 4: vehicles
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(100) NULL,
    vehicle_type VARCHAR(50) NULL,
    color VARCHAR(7) DEFAULT '#000000',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE is_active = true;

COMMENT ON TABLE vehicles IS 'Store vehicle information';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 5: routes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_checksum VARCHAR(64) NOT NULL,
    total_waypoints INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Day scheduling
    monday BOOLEAN DEFAULT false,
    tuesday BOOLEAN DEFAULT false,
    wednesday BOOLEAN DEFAULT false,
    thursday BOOLEAN DEFAULT false,
    friday BOOLEAN DEFAULT false,
    saturday BOOLEAN DEFAULT false,
    sunday BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX idx_routes_active ON routes(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_one_active_route_per_vehicle ON routes(vehicle_id) WHERE is_active = true;

COMMENT ON TABLE routes IS 'Store route metadata and day scheduling';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 6: waypoints
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    original_address TEXT NULL
);

CREATE INDEX idx_waypoints_route_seq ON waypoints(route_id, sequence_number);
CREATE INDEX idx_waypoints_route_time ON waypoints(route_id, timestamp);
CREATE UNIQUE INDEX idx_waypoints_route_sequence ON waypoints(route_id, sequence_number);

COMMENT ON TABLE waypoints IS 'Store route waypoints from Excel files';
COMMENT ON COLUMN waypoints.day_of_week IS '0=Monday, 1=Tuesday, ... 6=Sunday';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 7: vehicle_simulation_state
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vehicle_simulation_state (
    vehicle_id UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    active_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    current_latitude DECIMAL(10,8) NULL,
    current_longitude DECIMAL(11,8) NULL,
    current_speed DECIMAL(5,2) NULL,
    current_bearing DECIMAL(5,2) NULL,
    is_parked BOOLEAN DEFAULT false,
    parked_since TIMESTAMPTZ NULL,
    last_waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    next_waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    simulation_active BOOLEAN DEFAULT false,
    last_movement_time TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vss_active_route ON vehicle_simulation_state(active_route_id);

COMMENT ON TABLE vehicle_simulation_state IS 'Track real-time simulation state';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 8: geocode_cache
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS geocode_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    address_hash VARCHAR(64) UNIQUE NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    formatted_address TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    use_count INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX idx_geocode_hash ON geocode_cache(address_hash);

COMMENT ON TABLE geocode_cache IS 'Cache geocoded addresses to minimize API calls';


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE 9: system_settings
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_system_settings_key ON system_settings(setting_key);

COMMENT ON TABLE system_settings IS 'Store system configuration';


-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-create admin profile when user signs up
CREATE OR REPLACE FUNCTION create_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_profiles (id, username, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_admin_profile();


-- Update admin last_login
CREATE OR REPLACE FUNCTION update_admin_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE admin_profiles
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_last_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
    EXECUTE FUNCTION update_admin_last_login();
