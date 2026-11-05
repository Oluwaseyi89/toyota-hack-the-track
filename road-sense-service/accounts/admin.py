from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin is the place where roles and permission flags are granted, since
    self-registration can no longer set them.
    """
    list_display = (
        'username', 'email', 'role', 'team', 'can_access_live_data',
        'can_modify_strategy', 'can_acknowledge_alerts', 'is_staff', 'is_active',
    )
    list_filter = BaseUserAdmin.list_filter + (
        'role', 'can_modify_strategy', 'can_acknowledge_alerts',
    )
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Racing team access', {
            'fields': (
                'role', 'team', 'preferred_vehicle', 'can_access_live_data',
                'can_modify_strategy', 'can_acknowledge_alerts', 'last_activity',
            ),
        }),
    )


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'login_time', 'last_activity', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'ip_address')
    readonly_fields = ('session_key', 'login_time', 'last_activity')
