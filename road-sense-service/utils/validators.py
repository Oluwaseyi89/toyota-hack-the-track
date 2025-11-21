def validate_telemetry_data(data):
    """Validate telemetry data structure"""
    required_fields = ['vehicle_id', 'lap_number', 'lap_time', 'speed', 'position']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate data types and ranges
    if not isinstance(data['lap_number'], int) or data['lap_number'] < 0:
        return False, "Invalid lap number"
    
    if not isinstance(data['lap_time'], (int, float)) or data['lap_time'] <= 0:
        return False, "Invalid lap time"
    
    if not isinstance(data['speed'], (int, float)) or data['speed'] < 0:
        return False, "Invalid speed"
    
    if not isinstance(data['position'], int) or data['position'] < 1:
        return False, "Invalid position"
    
    return True, "Valid"

def validate_weather_data(data):
    """Validate weather data structure"""
    required_fields = ['track_temperature', 'air_temperature', 'humidity', 'pressure']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    return True, "Valid"