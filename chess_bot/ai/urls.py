from django.urls import path
from . import views

app_name = 'bot'

urlpatterns = [
    path('move/', views.get_bot_move, name='get_move'),
    path('validate/', views.validate_move, name='validate_move'),
    path('health/', views.health_check, name='health'),
]