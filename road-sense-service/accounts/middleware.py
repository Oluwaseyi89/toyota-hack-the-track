from django.utils import timezone
from .models import UserSession

class UserActivityMiddleware:
    """Track user activity and update last seen timestamp"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # FIXED: Check if user is authenticated AND session exists
        if request.user.is_authenticated and hasattr(request, 'session') and request.session.session_key:
            try:
                # Update user's last activity
                request.user.update_activity()
                
                # Update session activity - FIXED session_key access
                UserSession.objects.filter(
                    user=request.user,
                    session_key=request.session.session_key,
                    is_active=True
                ).update(last_activity=timezone.now())
            except Exception as e:
                # Log but don't break the request
                print(f"UserActivityMiddleware error: {e}")
        
        return response

class UserPreferencesMiddleware:
    """Inject user preferences into request context"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.user_preferences = {
                'preferred_vehicle': request.user.preferred_vehicle,
                'role': request.user.role,
                'team': request.user.team,
            }
        else:
            request.user_preferences = {}
            
        return self.get_response(request)