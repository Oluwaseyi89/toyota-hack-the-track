# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from . import views

# router = DefaultRouter()
# router.register(r'vehicles', views.VehicleViewSet)
# router.register(r'data', views.TelemetryDataViewSet)
# router.register(r'weather', views.WeatherDataViewSet)

# urlpatterns = [
#     path('', include(router.urls)),
# ]


from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')
router.register(r'data', views.TelemetryDataViewSet, basename='telemetry')
router.register(r'weather', views.WeatherDataViewSet, basename='weather')

urlpatterns = [
    path('', include(router.urls)),
]