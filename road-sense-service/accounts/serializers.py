from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, UserSession

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.is_active:
                    data['user'] = user
                    return data
                raise serializers.ValidationError('User account is disabled.')
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        raise serializers.ValidationError('Must include "username" and "password".')

USER_FIELDS = [
    'id', 'username', 'email', 'first_name', 'last_name', 'role',
    'team', 'can_access_live_data', 'can_modify_strategy',
    'can_acknowledge_alerts', 'preferred_vehicle', 'last_activity',
]

# Fields that grant privileges. Only admins may change them.
PRIVILEGED_FIELDS = [
    'role', 'team', 'can_access_live_data', 'can_modify_strategy',
    'can_acknowledge_alerts',
]


class UserSerializer(serializers.ModelSerializer):
    """Public representation of a user. Privilege fields are read-only."""

    class Meta:
        model = User
        fields = USER_FIELDS
        read_only_fields = ['id', 'last_activity', *PRIVILEGED_FIELDS]


class AdminUserSerializer(serializers.ModelSerializer):
    """Used by admin-only endpoints, where privilege fields are editable."""

    class Meta:
        model = User
        fields = USER_FIELDS
        read_only_fields = ['id', 'last_activity']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Self-service registration. Only identity fields are accepted; role and
    permission flags always fall back to the model defaults, so a client
    cannot grant itself privileges.
    """
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password']

    def validate(self, attrs):
        candidate = User(**{k: v for k, v in attrs.items() if k != 'password'})
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserSession
        fields = ['id', 'user', 'ip_address', 'login_time', 'last_activity', 'is_active']

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.context['request'].user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value