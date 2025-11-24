from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from django.contrib.auth import login, logout
from django.utils import timezone
from django.middleware.csrf import get_token
import logging

from .models import User, UserSession
from .serializers import (
    UserLoginSerializer, UserSerializer, 
    UserSessionSerializer, ChangePasswordSerializer
)
from .permissions import IsTeamMember, CanModifyStrategy, CanAcknowledgeAlerts

from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    """
    Get CSRF token as a cookie
    Frontend should call this before making any POST requests
    """
    return JsonResponse({
        'message': 'CSRF token set in cookies',
        'csrfToken': get_token(request)
    })

logger = logging.getLogger(__name__)

class AuthViewSet(viewsets.ViewSet):
    """
    Authentication endpoints for user login/logout
    """
    permission_classes = [permissions.AllowAny]
    
    # @method_decorator(ensure_csrf_cookie)
    # @action(detail=False, methods=['post'], url_path='login')
    # def user_login(self, request):
    #     """User login with session creation"""
    #     serializer = UserLoginSerializer(data=request.data)
        
    #     if serializer.is_valid():
    #         user = serializer.validated_data['user']
            
    #         # FIX: Ensure session exists before accessing session_key
    #         if not request.session.session_key:
    #             request.session.create()
            
    #         # FIX: Create user session with proper session key
    #         session = UserSession.objects.create(
    #             user=user,
    #             session_key=request.session.session_key,
    #             ip_address=self._get_client_ip(request),
    #             user_agent=request.META.get('HTTP_USER_AGENT', '')
    #         )
            
    #         # Login user (creates Django session)
    #         login(request, user)
            
    #         # Update user activity
    #         user.update_activity()
            
    #         logger.info(f"User {user.username} logged in from {session.ip_address}")
            
    #         return Response({
    #             'message': 'Login successful',
    #             'user': UserSerializer(user).data,
    #             'session': UserSessionSerializer(session).data,
    #             'permissions': {
    #                 'can_access_live_data': user.can_access_live_data,
    #                 'can_modify_strategy': user.can_modify_strategy,
    #                 'can_acknowledge_alerts': user.can_acknowledge_alerts,
    #             },
    #             'csrf_token': get_token(request)
    #         }, status=status.HTTP_200_OK)
        
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='login')
    def user_login(self, request):
        """User login with session creation"""
        serializer = UserLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        
        # Login user (Django handles session creation)
        login(request, user)
        
        # Create user session tracking
        session = UserSession.objects.create(
            user=user,
            session_key=request.session.session_key,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Update user activity
        user.update_activity()
        
        logger.info(f"User {user.username} logged in from {session.ip_address}")
        
        # Create response with CSRF cookie
        response = Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'session': UserSessionSerializer(session).data,
            'permissions': {
                'can_access_live_data': user.can_access_live_data,
                'can_modify_strategy': user.can_modify_strategy,
                'can_acknowledge_alerts': user.can_acknowledge_alerts,
            }
        }, status=status.HTTP_200_OK)
        
        # Ensure CSRF token is set as cookie
        self._set_csrf_cookie(response, request)
        
        return response
    
    @action(detail=False, methods=['post'], url_path='logout')
    def user_logout(self, request):
        """User logout with session cleanup"""
        if request.user.is_authenticated:
            # FIX: Check if session exists before using session_key
            session_key = request.session.session_key if request.session.exists() else None
            
            if session_key:
                UserSession.objects.filter(
                    user=request.user, 
                    session_key=session_key,
                    is_active=True
                ).update(is_active=False)
            
            username = request.user.username
            logout(request)
            
            logger.info(f"User {username} logged out")
            
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': 'No active session'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='me')
    def current_user(self, request):
        """Get current user information"""
        if request.user.is_authenticated:
            # Update activity timestamp
            request.user.update_activity()
            
            serializer = UserSerializer(request.user)
            return Response({
                'user': serializer.data,
                'permissions': {
                    'can_access_live_data': request.user.can_access_live_data,
                    'can_modify_strategy': request.user.can_modify_strategy,
                    'can_acknowledge_alerts': request.user.can_acknowledge_alerts,
                }
            })
        
        return Response({
            'error': 'Not authenticated'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        """Change user password"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = ChangePasswordSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            logger.info(f"User {request.user.username} changed password")
            
            return Response({
                'message': 'Password updated successfully'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @action(detail=False, methods=['post'], url_path='register')
    def user_register(self, request):
        """Register a new user"""
        from .serializers import UserSerializer
        
        # Create user with proper password handling
        user_data = request.data.copy()
        password = user_data.pop('password', None)
        
        serializer = UserSerializer(data=user_data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Set password properly
            if password:
                user.set_password(password)
                user.save()
            
            # Auto-login after registration
            if not request.session.session_key:
                request.session.create()
                
            login(request, user)
            
            # Create user session
            session = UserSession.objects.create(
                user=user,
                session_key=request.session.session_key,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'session': UserSessionSerializer(session).data,
                'permissions': {
                    'can_access_live_data': user.can_access_live_data,
                    'can_modify_strategy': user.can_modify_strategy,
                    'can_acknowledge_alerts': user.can_acknowledge_alerts,
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _set_csrf_cookie(self, response, request):
        """Helper method to set CSRF cookie with proper settings"""
        csrf_token = get_token(request)
        
        response.set_cookie(
            'csrftoken',
            csrf_token,
            max_age=31449600,  # 1 year
            secure=False,  # True in production
            samesite='Lax',  # 'None' in production for cross-domain
            httponly=False,  # JavaScript needs to read this
            path='/',
        )
        
        # Add CORS headers if needed
        response["Access-Control-Allow-Credentials"] = "true"

class UserViewSet(viewsets.ModelViewSet):
    """
    User management (admin only)
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate_user(self, request, pk=None):
        """Deactivate a user account"""
        user = self.get_object()
        user.is_active = False
        user.save()
        
        logger.warning(f"User {user.username} deactivated by {request.user.username}")
        
        return Response({
            'message': f'User {user.username} deactivated'
        })

class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View user sessions (admin only)
    """
    queryset = UserSession.objects.all().order_by('-login_time')
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'], url_path='active')
    def active_sessions(self, request):
        """Get all active sessions"""
        active_sessions = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(active_sessions, many=True)
        return Response(serializer.data)

