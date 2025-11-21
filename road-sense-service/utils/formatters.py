from datetime import timedelta

def format_lap_time(seconds):
    """Format lap time from seconds to MM:SS.sss"""
    if seconds is None:
        return "N/A"
    
    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60
    return f"{minutes}:{remaining_seconds:06.3f}"

def format_timedelta(delta):
    """Format timedelta to string"""
    if isinstance(delta, timedelta):
        total_seconds = delta.total_seconds()
        return format_lap_time(total_seconds)
    return str(delta)

def format_speed(speed_kmh):
    """Format speed with units"""
    return f"{speed_kmh:.1f} km/h"

def format_temperature(temp_c):
    """Format temperature with units"""
    return f"{temp_c:.1f}°C"

def format_pressure(pressure_hpa):
    """Format pressure with units"""
    return f"{pressure_hpa:.1f} hPa"