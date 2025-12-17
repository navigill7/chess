from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .serializers import (
    RegisterSerializer, UserSerializer,
    ChangePasswordSerializer, UserProfileSerializer
)

User = get_user_model()


def get_tokens_for_user(user):
    """Generate JWT tokens"""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register with email/password"""
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        user.is_email_verified = True  # Auto-verify for dev
        user.save()
        
        tokens = get_tokens_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'status': True
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'error': serializer.errors,
        'status': False
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email/password"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email and password required',
            'status': False
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid credentials',
            'status': False
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.check_password(password):
        return Response({
            'error': 'Invalid credentials',
            'status': False
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.is_active:
        return Response({
            'error': 'Account disabled',
            'status': False
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check if OAuth user trying to login with password
    if user.registration_method == 'google':
        return Response({
            'error': 'Please login with Google',
            'status': False
        }, status=status.HTTP_403_FORBIDDEN)
    
    user.is_online = True
    user.save(update_fields=['is_online'])
    
    tokens = get_tokens_for_user(user)
    
    return Response({
        'user': UserSerializer(user).data,
        'tokens': tokens,
        'status': True
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """Google OAuth - Users never see this URL directly"""
    token = request.data.get('token')
    
    if not token:
        return Response({
            'error': 'Token not provided',
            'status': False
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID
        )
        
        email = id_info['email']
        first_name = id_info.get('given_name', '')
        last_name = id_info.get('family_name', '')
        profile_pic = id_info.get('picture', '')
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
                'registration_method': 'google',
                'is_email_verified': True,
            }
        )
        
        if created:
            user.set_unusable_password()
            user.save()
        else:
            # Existing user trying to login with Google
            if user.registration_method != 'google':
                return Response({
                    'error': 'Please login with email and password',
                    'status': False
                }, status=status.HTTP_403_FORBIDDEN)
        
        user.is_online = True
        user.save(update_fields=['is_online'])
        
        tokens = get_tokens_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'is_new_user': created,
            'status': True
        }, status=status.HTTP_200_OK)
        
    except ValueError:
        return Response({
            'error': 'Invalid Google token',
            'status': False
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout - blacklist refresh token"""
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'error': 'Refresh token required',
                'status': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        request.user.is_online = False
        request.user.save(update_fields=['is_online'])
        
        return Response({
            'message': 'Logout successful',
            'status': True
        })
    except Exception as e:
        return Response({
            'error': 'Invalid token',
            'status': False
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get authenticated user"""
    return Response({
        'user': UserSerializer(request.user).data,
        'status': True
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update profile"""
    serializer = UserProfileSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'user': UserSerializer(request.user).data,
            'status': True
        })
    
    return Response({
        'error': serializer.errors,
        'status': False
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password"""
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({
            'message': 'Password changed successfully',
            'status': True
        })
    
    return Response({
        'error': serializer.errors,
        'status': False
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_profile(request, username):
    """Get user by username"""
    try:
        user = User.objects.get(username=username)
        return Response({
            'user': UserSerializer(user).data,
            'status': True
        })
    except User.DoesNotExist:
        return Response({
            'error': 'User not found',
            'status': False
        }, status=status.HTTP_404_NOT_FOUND)