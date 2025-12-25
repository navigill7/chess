from django.urls import path
from . import views

app_name = 'bot'

urlpatterns = [
    # Game session endpoints
    path('games/create/', views.create_game, name='create_game'),
    path('games/<str:game_id>/', views.get_game, name='get_game'),
    path('games/<str:game_id>/move/', views.make_move, name='make_move'),
    path('games/<str:game_id>/delete/', views.delete_game, name='delete_game'),
    
    # Utility endpoints
    path('stats/', views.get_stats, name='stats'),
    path('health/', views.health_check, name='health'),
]
