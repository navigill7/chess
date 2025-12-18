from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Friendship, FriendRequest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""
    list_display = ['email', 'username', 'rating', 'games_played', 'is_online', 'registration_method']
    list_filter = ['registration_method', 'is_online', 'is_staff', 'is_active']
    search_fields = ['email', 'username']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('username', 'first_name', 'last_name', 'avatar', 'country', 'bio')}),
        ('Chess Stats', {'fields': ('rating', 'games_played', 'games_won', 'games_lost', 'games_drawn')}),
        ('Status', {'fields': ('is_online', 'last_seen')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Authentication', {'fields': ('registration_method', 'is_email_verified')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    """Friendship admin"""
    list_display = ['user1', 'user2', 'created_at']
    search_fields = ['user1__username', 'user2__username']
    list_filter = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    """Friend Request admin"""
    list_display = ['from_user', 'to_user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['from_user__username', 'to_user__username']
    date_hierarchy = 'created_at'