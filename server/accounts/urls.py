from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import friend_views

urlpatterns = [
    # Authentication - JWT
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Traditional registration/login (keep for backward compatibility if needed)
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),

    # OAuth
    path('google/', views.google_auth, name='google_auth'),
    path('google/callback/', views.google_callback, name='google_callback'),
    
    # User management
    path('verify-email/<str:token>/', views.verify_email, name='verify_email'),
    path('me/', views.get_current_user, name='current_user'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('password/change/', views.change_password, name='change_password'),
    path('users/<str:username>/', views.get_user_profile, name='user_profile'),

    # Friends
    path('friends/', friend_views.get_friends, name='get_friends'),
    path('friends/requests/', friend_views.get_friend_requests, name='get_friend_requests'),
    path('friends/request/', friend_views.send_friend_request, name='send_friend_request'),
    path('friends/accept/', friend_views.accept_friend_request, name='accept_friend_request'),
    path('friends/reject/', friend_views.reject_friend_request, name='reject_friend_request'),
    path('friends/<int:user_id>/', friend_views.remove_friend, name='remove_friend'),
    path('users/search/', friend_views.search_users, name='search_users'),
]