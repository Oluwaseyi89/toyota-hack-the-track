from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'performance', views.PerformanceAnalysisViewSet)
router.register(r'simulations', views.RaceSimulationViewSet)
router.register(r'summary', views.AnalyticsSummaryViewSet, basename='summary')

urlpatterns = [
    path('', include(router.urls)),
]