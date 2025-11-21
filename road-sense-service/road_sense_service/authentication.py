from django.contrib.auth import get_user_model
from rest_framework import authentication

User = get_user_model()

class SessionAuthentication(authentication.SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Disable CSRF for API calls

class BearerAuthentication(authentication.TokenAuthentication):
    keyword = 'Bearer'