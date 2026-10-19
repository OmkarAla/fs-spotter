from django.urls import path
from .views import RouteTriggerView, RouteStatusView

urlpatterns = [
    path('', RouteTriggerView.as_view(), name='route-trigger'),
    path('<uuid:id>/', RouteStatusView.as_view(), name='route-status'),
]
