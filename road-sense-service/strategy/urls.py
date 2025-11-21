from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pit', views.PitStrategyViewSet)
router.register(r'tire', views.TireStrategyViewSet)
router.register(r'predictions', views.StrategyPredictionViewSet, basename='predictions')

urlpatterns = [
    path('', include(router.urls)),
]