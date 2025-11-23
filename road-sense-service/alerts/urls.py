# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from . import views

# router = DefaultRouter()
# router.register(r'alerts', views.AlertViewSet)
# router.register(r'rules', views.AlertRuleViewSet)

# urlpatterns = [
#     path('', include(router.urls)),
# ]




from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'alerts', views.AlertViewSet, basename='alert')
router.register(r'rules', views.AlertRuleViewSet, basename='alertrule')

# Custom URL patterns for specific actions
urlpatterns = [
    path('', include(router.urls)),
    
    # Explicit URLs for clarity (optional but recommended)
    path('alerts/active/', views.AlertViewSet.as_view({'get': 'active'}), name='alert-active'),
    path('alerts/check_conditions/', views.AlertViewSet.as_view({'post': 'check_conditions'}), name='alert-check-conditions'),
    path('alerts/summary/', views.AlertViewSet.as_view({'get': 'summary'}), name='alert-summary'),
]