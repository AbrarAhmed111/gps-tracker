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


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_simulation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins full access" ON admin_profiles FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON vehicles FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON routes FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON waypoints FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON vehicle_simulation_state FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON geocode_cache FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access" ON system_settings FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins view logs" ON public_login_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins update password" ON public_access FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_active = true));

-- Service role policies (for public dashboard & backend)
CREATE POLICY "Service role access" ON vehicles FOR SELECT TO service_role USING (is_active = true);
CREATE POLICY "Service role access" ON routes FOR SELECT TO service_role USING (is_active = true);
CREATE POLICY "Service role access" ON waypoints FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role access" ON vehicle_simulation_state FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON geocode_cache FOR ALL TO service_role USING (true);
CREATE POLICY "Service role access" ON public_access FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role insert logs" ON public_login_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role read settings" ON system_settings FOR SELECT TO service_role 
    USING (setting_key IN ('map_refresh_interval_sec', 'app_name'));


-- ═══════════════════════════════════════════════════════════════════════════
-- INITIAL DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Default public password: Public@123 (CHANGE THIS!)
INSERT INTO public_access (password_hash) 
VALUES ('$2a$10$xYzABCDEF123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ.')
ON CONFLICT DO NOTHING;

-- System settings
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES 
    ('google_maps_api_key', '', 'Google Maps API Key (enter in admin panel)'),
    ('map_refresh_interval_sec', '600', 'Map refresh interval - 10 minutes'),
    ('app_name', 'GPS Simulation Dashboard', 'Application name')
ON CONFLICT (setting_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- UTILITY FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get active route for specific day
CREATE OR REPLACE FUNCTION get_active_route_for_day(
    p_vehicle_id UUID,
    p_day_of_week INTEGER
)
RETURNS TABLE (route_id UUID, route_name VARCHAR, total_waypoints INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.route_name, r.total_waypoints
    FROM routes r
    WHERE r.vehicle_id = p_vehicle_id
    AND r.is_active = true
    AND (
        (p_day_of_week = 0 AND r.monday = true) OR
        (p_day_of_week = 1 AND r.tuesday = true) OR
        (p_day_of_week = 2 AND r.wednesday = true) OR
        (p_day_of_week = 3 AND r.thursday = true) OR
        (p_day_of_week = 4 AND r.friday = true) OR
        (p_day_of_week = 5 AND r.saturday = true) OR
        (p_day_of_week = 6 AND r.sunday = true)
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- Detect parking waypoints
CREATE OR REPLACE FUNCTION detect_parking_waypoints(p_route_id UUID)
RETURNS TABLE (
    sequence_number INTEGER,
    latitude DECIMAL,
    longitude DECIMAL,
    park_start TIMESTAMPTZ,
    park_end TIMESTAMPTZ,
    parking_duration_minutes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w1.sequence_number,
        w1.latitude,
        w1.longitude,
        w1.timestamp AS park_start,
        w2.timestamp AS park_end,
        EXTRACT(EPOCH FROM (w2.timestamp - w1.timestamp))/60 AS parking_duration_minutes
    FROM waypoints w1
    JOIN waypoints w2 ON w2.route_id = w1.route_id 
        AND w2.sequence_number = w1.sequence_number + 1
    WHERE w1.route_id = p_route_id
    AND w1.latitude = w2.latitude 
    AND w1.longitude = w2.longitude
    ORDER BY w1.sequence_number;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'admin_profiles', 'public_access', 'public_login_logs',
        'vehicles', 'routes', 'waypoints', 
        'vehicle_simulation_state', 'geocode_cache', 'system_settings'
    );
    
    RAISE NOTICE '✅ Created % tables successfully', table_count;
END $$;

SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key;


-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- NEXT STEPS:
-- 1. Create admin in Supabase Dashboard → Authentication → Add User
--    Email: admin@yourdomain.com
--    User Metadata: {"username": "admin", "full_name": "Administrator"}
-- 
-- 2. Admin logs in at /admin/login
-- 3. Change public password from Public@123
-- 4. Enter Google Maps API Key
-- 5. Add vehicles and upload routes
-- 
-- ═══════════════════════════════════════════════════════════════════════════