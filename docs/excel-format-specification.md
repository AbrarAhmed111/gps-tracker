# Excel File Format Specification for Routes

This document describes the complete column specification for Excel files used to upload routes.

## Required Columns

These columns **must** be present in your Excel file:

### 1. `timestamp` (Required)
- **Type**: Date/Time
- **Format**: ISO 8601 or `YYYY-MM-DD HH:MM:SS`
- **Description**: The scheduled time for the vehicle to arrive at this waypoint
- **Examples**:
  - `2025-11-20 09:00:00`
  - `2025-11-20 09:15:00`
  - `2025-11-20T09:00:00`
- **Notes**: Can be in various date/time formats; the system will parse them automatically

### 2. `day_of_week` (Required)
- **Type**: Integer
- **Format**: Number 0-6
- **Description**: Day of the week for this waypoint (used to automatically detect active days)
- **Values**:
  - `0` = Monday
  - `1` = Tuesday
  - `2` = Wednesday
  - `3` = Thursday
  - `4` = Friday
  - `5` = Saturday
  - `6` = Sunday
- **Example**: `2` (Wednesday)

### 3. `address` (Required)
- **Type**: Text/String
- **Format**: Any readable address
- **Description**: The address of the waypoint location. If coordinates are not provided, this address will be automatically geocoded to get latitude/longitude.
- **Examples**:
  - `F-10 Markaz, Islamabad, Pakistan`
  - `Blue Area, Islamabad`
  - `123 Main Street, New York, NY 10001`
- **Notes**: 
  - Must be a valid address that can be geocoded by Google Maps
  - If coordinates are provided, this is still stored for reference

## Optional Columns

These columns are **optional** but can enhance your route data:

### 4. `latitude` (Optional)
- **Type**: Decimal/Number
- **Format**: Decimal degrees
- **Range**: -90.0 to 90.0
- **Description**: Latitude coordinate of the waypoint
- **Example**: `33.6844`
- **Notes**: 
  - If provided, the system will use these coordinates directly
  - If missing, the system will geocode the `address` to get coordinates
  - More accurate than geocoding if you have precise GPS coordinates

### 5. `longitude` (Optional)
- **Type**: Decimal/Number
- **Format**: Decimal degrees
- **Range**: -180.0 to 180.0
- **Description**: Longitude coordinate of the waypoint
- **Example**: `73.0479`
- **Notes**: 
  - Must be provided together with `latitude` if you want to use coordinates
  - If missing, the system will geocode the `address` to get coordinates

### 6. `sequence` (Optional)
- **Type**: Integer
- **Format**: Positive number
- **Description**: Order/sequence number for waypoints within the same day
- **Example**: `1`, `2`, `3`
- **Notes**: 
  - If not provided, the system will use the row order as the sequence
  - Useful for explicitly controlling the order of waypoints
  - Should be unique per day

### 7. `is_parking` (Optional)
- **Type**: Boolean
- **Format**: `TRUE`/`FALSE`, `1`/`0`, or `Yes`/`No`
- **Description**: Indicates if this waypoint is a parking/stop location
- **Example**: `TRUE`, `FALSE`, `1`, `0`
- **Notes**: 
  - Used to identify parking points in the route
  - Defaults to `FALSE` if not provided
  - Parking points may have additional duration information

### 8. `parking_duration_minutes` (Optional)
- **Type**: Integer
- **Format**: Positive number (minutes)
- **Description**: Duration in minutes the vehicle should stay at this parking location
- **Example**: `10`, `20`, `30`
- **Notes**: 
  - Only meaningful when `is_parking` is `TRUE`
  - Used for calculating route timing and ETA
  - Can be left empty for non-parking waypoints

### 9. `notes` (Optional)
- **Type**: Text/String
- **Format**: Free text
- **Description**: Additional notes or comments about this waypoint
- **Example**: `Customer delivery`, `Fuel stop`, `Long route note 1`
- **Notes**: 
  - Can contain any text information
  - Useful for adding context or instructions
  - Stored but not used in calculations

## Example Excel File Structure

Here's a complete example showing all columns:

| timestamp | day_of_week | address | latitude | longitude | sequence | is_parking | parking_duration_minutes | notes |
|-----------|-------------|---------|----------|-----------|----------|------------|-------------------------|-------|
| 2025-11-20 09:00:00 | 2 | F-10 Markaz, Islamabad, Pakistan | 33.6844 | 73.0479 | 1 | FALSE | | Normal movement |
| 2025-11-20 09:15:00 | 2 | Blue Area, Islamabad | 33.693 | 73.065 | 2 | FALSE | | Normal movement |
| 2025-11-20 09:30:00 | 2 | F-6 Markaz, Islamabad | 33.709 | 73.0525 | 3 | TRUE | 20 | Parking stop |
| 2025-11-20 09:45:00 | 2 | F-8 Markaz, Islamabad | | | 4 | FALSE | | Normal movement |

## Minimal Example (Only Required Columns)

You can create a route with just the required columns:

| timestamp | day_of_week | address |
|-----------|-------------|---------|
| 2025-11-20 09:00:00 | 2 | F-10 Markaz, Islamabad, Pakistan |
| 2025-11-20 09:15:00 | 2 | Blue Area, Islamabad |
| 2025-11-20 09:30:00 | 2 | F-6 Markaz, Islamabad |

The system will automatically:
- Geocode addresses to get coordinates
- Assign sequence numbers based on row order
- Set `is_parking` to `FALSE` by default
- Use the `day_of_week` values to determine which days the route is active

## Column Name Variations

The system is case-insensitive and will normalize column names. These are all valid:
- `Timestamp`, `TIMESTAMP`, `timestamp`
- `Day_Of_Week`, `day_of_week`, `DAY_OF_WEEK`
- `Address`, `ADDRESS`, `address`
- `Latitude`, `LATITUDE`, `latitude`
- `Longitude`, `LONGITUDE`, `longitude`
- `Sequence`, `SEQUENCE`, `sequence`
- `Is_Parking`, `is_parking`, `IS_PARKING`
- `Parking_Duration_Minutes`, `parking_duration_minutes`
- `Notes`, `NOTES`, `notes`

## Important Notes

1. **Address Geocoding**: If you don't provide coordinates, make sure your addresses are clear and complete to ensure accurate geocoding.

2. **Day of Week**: The `day_of_week` column determines which days the route is active. The system automatically sets the route's active days based on the unique values in this column.

3. **Multiple Days**: You can include waypoints for multiple days in one file. Just use different `day_of_week` values.

4. **Parking Points**: Mark parking locations with `is_parking = TRUE` and optionally specify `parking_duration_minutes`.

5. **Sequence**: If you don't provide sequence numbers, the system will use the row order within each day.

6. **File Format**: Excel files should be in `.xlsx` or `.xls` format.

## Data Validation

The system will validate:
- ✅ Required columns are present
- ✅ Timestamps can be parsed
- ✅ Day of week values are 0-6
- ✅ Coordinates (if provided) are within valid ranges
- ✅ Addresses can be geocoded (if coordinates missing)

Errors will be shown if:
- ❌ Required columns are missing
- ❌ Addresses cannot be geocoded
- ❌ Invalid data types or formats

