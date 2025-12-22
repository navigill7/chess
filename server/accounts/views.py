from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
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
from django.db.models import Q, Count, Prefetch
from django.contrib.postgres.search import TrigramSimilarity
from .models import User, Friend, FriendRequest


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
            'token': tokens['access'],
            'refresh': tokens['refresh'],
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
        'token': tokens['access'],
        'refresh': tokens['refresh'],
        'status': True
    })

from django.views.decorators.csrf import csrf_exempt

@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
@csrf_exempt
def google_auth(request):
    """Google OAuth - Users never see this URL directly"""
    
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = JsonResponse({'status': 'ok'})
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    token = request.data.get('token')
    
    if not token:
        return Response({
            'error': 'Token not provided',
            'status': False
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify the token with Google
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID
        )
        
        email = id_info['email']
        first_name = id_info.get('given_name', '')
        last_name = id_info.get('family_name', '')
        
        # Try to get existing user
        user = User.objects.filter(email=email).first()
        
        if user:
            # User exists - check registration method
            if user.registration_method != 'google':
                # CONFLICT: Email registered with password
                return Response({
                    'error': f'This email is already registered with email/password. Please login with your password instead, or use a different Google account.',
                    'status': False,
                    'conflict': True
                }, status=status.HTTP_409_CONFLICT)
        else:
            # New user - create with Google
            user = User.objects.create_user(
                email=email,
                username=email.split('@')[0],
                first_name=first_name,
                last_name=last_name,
                registration_method='google',
                is_email_verified=True,
            )
            user.set_unusable_password()
            user.save()
        
        # Set user online
        user.is_online = True
        user.save(update_fields=['is_online'])
        
        # Generate tokens
        tokens = get_tokens_for_user(user)
        
        response_data = {
            'user': UserSerializer(user).data,
            'token': tokens['access'],
            'refresh': tokens['refresh'],
            'is_new_user': not bool(User.objects.filter(email=email, registration_method='google').exists()),
            'status': True
        }
        
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Add CORS headers explicitly
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        return response
        
    except ValueError as e:
        print(f"❌ Google token verification failed: {e}")
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
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search for users with optimized queries
    Supports: username, email, fuzzy matching
    """
    query = request.query_params.get('q', '').strip()
    
    if not query:
        return Response({
            'results': [],
            'message': 'Please provide a search query'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(query) < 2:
        return Response({
            'results': [],
            'message': 'Search query must be at least 2 characters'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    current_user = request.user
    
    # Get user's existing friends and pending requests
    friend_ids = Friend.objects.filter(
        Q(user=current_user) | Q(friend=current_user)
    ).values_list('friend_id', 'user_id')
    
    friend_ids_flat = set()
    for user_id, friend_id in friend_ids:
        friend_ids_flat.add(user_id)
        friend_ids_flat.add(friend_id)
    friend_ids_flat.discard(current_user.id)
    
    pending_request_ids = FriendRequest.objects.filter(
        Q(sender=current_user) | Q(receiver=current_user),
        status='pending'
    ).values_list('sender_id', 'receiver_id')
    
    pending_ids_flat = set()
    for sender_id, receiver_id in pending_request_ids:
        pending_ids_flat.add(sender_id)
        pending_ids_flat.add(receiver_id)
    pending_ids_flat.discard(current_user.id)
    
    # Search users
    # Try PostgreSQL trigram similarity if available, otherwise use icontains
    try:
        users = User.objects.annotate(
            similarity=TrigramSimilarity('username', query)
        ).filter(
            Q(similarity__gt=0.3) |
            Q(username__icontains=query) |
            Q(email__icontains=query)
        ).exclude(
            id=current_user.id
        ).select_related().order_by('-similarity', '-rating')[:20]
    except:
        # Fallback if PostgreSQL extensions not available
        users = User.objects.filter(
            Q(username__icontains=query) | Q(email__icontains=query)
        ).exclude(
            id=current_user.id
        ).select_related().order_by('-rating')[:20]
    
    # Annotate results with friendship status
    results = []
    for user in users:
        user_data = UserSerializer(user).data
        
        # Determine relationship status
        if user.id in friend_ids_flat:
            user_data['friendship_status'] = 'friend'
        elif user.id in pending_ids_flat:
            # Check if we sent or received the request
            sent_request = FriendRequest.objects.filter(
                sender=current_user,
                receiver=user,
                status='pending'
            ).exists()
            
            received_request = FriendRequest.objects.filter(
                sender=user,
                receiver=current_user,
                status='pending'
            ).exists()
            
            if sent_request:
                user_data['friendship_status'] = 'request_sent'
            elif received_request:
                user_data['friendship_status'] = 'request_received'
            else:
                user_data['friendship_status'] = 'none'
        else:
            user_data['friendship_status'] = 'none'
        
        results.append(user_data)
    
    return Response({
        'results': results,
        'count': len(results)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends(request):
    """
    Get user's friends with online status and game info
    """
    user = request.user
    
    # Get all friend relationships
    friends_as_user = Friend.objects.filter(user=user).select_related('friend')
    friends_as_friend = Friend.objects.filter(friend=user).select_related('user')
    
    friends = []
    
    for friendship in friends_as_user:
        friend = friendship.friend
        friends.append(_serialize_friend(friend, user))
    
    for friendship in friends_as_friend:
        friend = friendship.user
        friends.append(_serialize_friend(friend, user))
    
    # Sort by online status, then by rating
    friends.sort(key=lambda x: (not x['is_online'], -x['rating']))
    
    return Response({
        'friends': friends,
        'count': len(friends)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friend_requests(request):
    """
    Get pending friend requests (both sent and received)
    """
    user = request.user
    
    # Received requests
    received_requests = FriendRequest.objects.filter(
        receiver=user,
        status='pending'
    ).select_related('sender').order_by('-created_at')
    
    # Sent requests
    sent_requests = FriendRequest.objects.filter(
        sender=user,
        status='pending'
    ).select_related('receiver').order_by('-created_at')
    
    received_data = []
    for req in received_requests:
        received_data.append({
            'id': req.id,
            'user': UserSerializer(req.sender).data,
            'created_at': req.created_at.isoformat(),
            'type': 'received'
        })
    
    sent_data = []
    for req in sent_requests:
        sent_data.append({
            'id': req.id,
            'user': UserSerializer(req.receiver).data,
            'created_at': req.created_at.isoformat(),
            'type': 'sent'
        })
    
    return Response({
        'received': received_data,
        'sent': sent_data,
        'total_received': len(received_data),
        'total_sent': len(sent_data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    """
    Send friend request to another user
    """
    username = request.data.get('username')
    
    if not username:
        return Response({
            'error': 'Username is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        receiver = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    sender = request.user
    
    # Can't send request to self
    if sender == receiver:
        return Response({
            'error': 'Cannot send friend request to yourself'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already friends
    already_friends = Friend.objects.filter(
        Q(user=sender, friend=receiver) |
        Q(user=receiver, friend=sender)
    ).exists()
    
    if already_friends:
        return Response({
            'error': 'Already friends with this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for existing pending request
    existing_request = FriendRequest.objects.filter(
        Q(sender=sender, receiver=receiver) |
        Q(sender=receiver, receiver=sender),
        status='pending'
    ).first()
    
    if existing_request:
        if existing_request.sender == sender:
            return Response({
                'error': 'Friend request already sent'
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # They sent us a request, auto-accept it
            existing_request.status = 'accepted'
            existing_request.save()
            
            Friend.objects.create(user=sender, friend=receiver)
            
            # Notify both users
            _notify_friend_request_accepted(sender, receiver)
            _notify_friend_request_accepted(receiver, sender)
            
            return Response({
                'message': 'Friend request automatically accepted',
                'friend': UserSerializer(receiver).data
            }, status=status.HTTP_201_CREATED)
    
    # Create new friend request
    friend_request = FriendRequest.objects.create(
        sender=sender,
        receiver=receiver
    )
    
    # Notify receiver
    _notify_friend_request_received(receiver, sender)
    
    return Response({
        'message': 'Friend request sent',
        'request_id': friend_request.id
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_friend_request(request):
    """
    Accept a friend request
    """
    request_id = request.data.get('request_id')
    
    if not request_id:
        return Response({
            'error': 'Request ID is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        friend_request = FriendRequest.objects.select_related('sender', 'receiver').get(
            id=request_id,
            receiver=request.user,
            status='pending'
        )
    except FriendRequest.DoesNotExist:
        return Response({
            'error': 'Friend request not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Accept request
    friend_request.status = 'accepted'
    friend_request.save()
    
    # Create friendship
    Friend.objects.create(user=request.user, friend=friend_request.sender)
    
    # Notify sender
    _notify_friend_request_accepted(friend_request.sender, request.user)
    
    return Response({
        'message': 'Friend request accepted',
        'friend': UserSerializer(friend_request.sender).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_friend_request(request):
    """
    Reject a friend request
    """
    request_id = request.data.get('request_id')
    
    if not request_id:
        return Response({
            'error': 'Request ID is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        friend_request = FriendRequest.objects.get(
            id=request_id,
            receiver=request.user,
            status='pending'
        )
    except FriendRequest.DoesNotExist:
        return Response({
            'error': 'Friend request not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Reject request
    friend_request.status = 'rejected'
    friend_request.save()
    
    return Response({
        'message': 'Friend request rejected'
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_friend(request, user_id):
    """
    Remove a friend
    """
    try:
        friend = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Delete friendship
    deleted = Friend.objects.filter(
        Q(user=request.user, friend=friend) |
        Q(user=friend, friend=request.user)
    ).delete()
    
    if deleted[0] == 0:
        return Response({
            'error': 'Not friends with this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'message': 'Friend removed successfully'
    })


# HELPER FUNCTIONS

def _serialize_friend(friend, current_user):
    """Serialize friend with additional info"""
    from game.models import Game
    
    friend_data = UserSerializer(friend).data
    
    # Check if friend is in an active game
    active_game = Game.objects.filter(
        status='ongoing'
    ).filter(
        Q(white_player=friend) | Q(black_player=friend)
    ).first()
    
    if active_game:
        friend_data['in_game'] = True
        friend_data['game_id'] = active_game.game_id
    else:
        friend_data['in_game'] = False
    
    return friend_data


def _notify_friend_request_received(receiver, sender):
    """Notify user they received a friend request"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{receiver.id}",
        {
            'type': 'friend_request_received',
            'sender': {
                'id': sender.id,
                'username': sender.username,
                'rating': sender.rating
            }
        }
    )


def _notify_friend_request_accepted(receiver, accepter):
    """Notify user their friend request was accepted"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{receiver.id}",
        {
            'type': 'friend_request_accepted',
            'user': {
                'id': accepter.id,
                'username': accepter.username,
                'rating': accepter.rating
            }
        }
    )