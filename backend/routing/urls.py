from django.urls import path
from .views import HealthView, RouteForecastView, RouteStatusView, RouteTriggerView

urlpatterns = [
    path('', RouteTriggerView.as_view(), name='route-trigger'),
    path('health/', HealthView.as_view(), name='health'),
    path('<uuid:id>/', RouteStatusView.as_view(), name='route-status'),
    path('<uuid:id>/forecast/', RouteForecastView.as_view(), name='route-forecast'),
]
