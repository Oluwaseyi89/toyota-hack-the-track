from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    """Custom user model for racing team members"""
    ROLE_CHOICES = [
        ('RACE_ENGINEER', 'Race Engineer'),
        ('STRATEGIST', 'Strategist'),
        ('TEAM_MANAGER', 'Team Manager'),
        ('DATA_ANALYST', 'Data Analyst'),
        ('VIEWER', 'Viewer'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VIEWER')
    team = models.CharField(max_length=100, default='Toyota GR Team')
    can_access_live_data = models.BooleanField(default=True)
    can_modify_strategy = models.BooleanField(default=False)
    can_acknowledge_alerts = models.BooleanField(default=False)
    preferred_vehicle = models.ForeignKey(
        'telemetry.Vehicle', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="User's preferred vehicle to monitor"
    )
    last_activity = models.DateTimeField(default=timezone.now)
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
    
    def has_permission(self, permission):
        """Check if user has specific permission"""
        permissions = {
            'view_live_data': self.can_access_live_data,
            'modify_strategy': self.can_modify_strategy,
            'acknowledge_alerts': self.can_acknowledge_alerts,
        }
        return permissions.get(permission, False)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class UserSession(models.Model):
    """Track user sessions and activity"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['last_activity']),
        ]