from rest_framework import permissions

class IsTeamMember(permissions.BasePermission):
    """Allow access only to authenticated team members"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class CanAccessLiveData(permissions.BasePermission):
    """Allow access to live telemetry data"""
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.can_access_live_data)

class CanModifyStrategy(permissions.BasePermission):
    """Allow strategy modifications"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and 
                request.user.is_authenticated and 
                request.user.can_modify_strategy)

class CanAcknowledgeAlerts(permissions.BasePermission):
    """Allow alert acknowledgment"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and 
                request.user.is_authenticated and 
                request.user.can_acknowledge_alerts)

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission to only allow owners of an object to edit it"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user