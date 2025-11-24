"""
URL configuration for road_sense_service project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""


"""
URL configuration for road_sense_service project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger/OpenAPI documentation
schema_view = get_schema_view(
    openapi.Info(
        title="Road Sense Racing API",
        default_version='v1',
        description="Real-time racing analytics and strategy platform",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="support@roadsense.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Authentication (Django REST Framework built-in)
    # path('api/auth/', include('rest_framework.urls')),
      # Authentication & User Management
    path('api/accounts/', include('accounts.urls')),
    
    # API Endpoints
    path('api/telemetry/', include('telemetry.urls')),
    path('api/strategy/', include('strategy.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/alerts/', include('alerts.urls')),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Health check
    path('health/', TemplateView.as_view(template_name='health.html'), name='health'),
    
    # Root redirect to API docs
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]