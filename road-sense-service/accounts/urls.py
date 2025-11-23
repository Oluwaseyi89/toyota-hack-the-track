from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'sessions', views.UserSessionViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),

    path('csrf-token/', views.csrf_token, name='csrf-token'),
]