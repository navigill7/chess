from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Friendship, FriendRequest
from .friend_serializers import FriendshipSerializer, FriendRequestSerializer, FriendUserSerializer
from .redis_pubsub import notify_user_via_channel

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends(request):
    """Get all friends of current user"""
    friendships = Friendship.objects.filter(
        Q(user1=request.user) | Q(user2=request.user)
    )
    
    serializer = FriendshipSerializer(
        friendships, 
        many=True, 
        context={'request': request}
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friend_requests(request):
    """Get pending friend requests received by current user"""
    requests = FriendRequest.objects.filter(
        to_user=request.user,
        status='pending'
    )
    
    serializer = FriendRequestSerializer(requests, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    """Send a friend request to another user"""
    username = request.data.get('username')
    
    if not username:
        return Response(
            {'error': 'Username is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        to_user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Can't send request to yourself
    if to_user == request.user:
        return Response(
            {'error': 'Cannot send friend request to yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already friends
    existing_friendship = Friendship.objects.filter(
        Q(user1=request.user, user2=to_user) |
        Q(user1=to_user, user2=request.user)
    ).first()
    
    if existing_friendship:
        return Response(
            {'error': 'Already friends with this user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if request already exists
    existing_request = FriendRequest.objects.filter(
        Q(from_user=request.user, to_user=to_user) |
        Q(from_user=to_user, to_user=request.user)
    ).first()
    
    if existing_request:
        if existing_request.status == 'pending':
            return Response(
                {'error': 'Friend request already pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Create friend request
    friend_request = FriendRequest.objects.create(
        from_user=request.user,
        to_user=to_user
    )

    notify_user_via_channel(to_user.id, {
        'type': 'friend_request_received',
        'request_id': friend_request.id,
        'from_user': {
            'id': request.user.id,
            'username': request.user.username,
            'avatar': request.user.avatar.url if request.user.avatar else None,
            'rating': request.user.rating,
        },
        'created_at': friend_request.created_at.isoformat(),
    })
    
    serializer = FriendRequestSerializer(friend_request)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_friend_request(request):
    """Accept a friend request"""
    request_id = request.data.get('request_id')
    
    if not request_id:
        return Response(
            {'error': 'request_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    friend_request = get_object_or_404(
        FriendRequest,
        id=request_id,
        to_user=request.user,
        status='pending'
    )

    notify_user_via_channel(friend_request.from_user.id, {
        'type': 'friend_request_accepted',
        'accepted_by': {
            'id': request.user.id,
            'username': request.user.username,
        }
    })
    
    # Update request status
    friend_request.status = 'accepted'
    friend_request.save()
    
    # Create friendship
    Friendship.objects.create(
        user1=friend_request.from_user,
        user2=friend_request.to_user
    )
    
    return Response({'message': 'Friend request accepted'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_friend_request(request):
    """Reject a friend request"""
    request_id = request.data.get('request_id')
    
    if not request_id:
        return Response(
            {'error': 'request_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    friend_request = get_object_or_404(
        FriendRequest,
        id=request_id,
        to_user=request.user,
        status='pending'
    )
    
    friend_request.status = 'rejected'
    friend_request.save()
    
    return Response({'message': 'Friend request rejected'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_friend(request, user_id):
    """Remove a friend"""
    try:
        friend = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    friendship = Friendship.objects.filter(
        Q(user1=request.user, user2=friend) |
        Q(user1=friend, user2=request.user)
    ).first()
    
    if not friendship:
        return Response(
            {'error': 'Not friends with this user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    friendship.delete()
    return Response({'message': 'Friend removed'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """Search for users by username"""
    query = request.query_params.get('q', '')
    
    if len(query) < 2:
        return Response(
            {'error': 'Query must be at least 2 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    users = User.objects.filter(
        username__icontains=query
    ).exclude(
        id=request.user.id
    )[:10]  # Limit to 10 results
    
    # Add is_friend flag
    results = []
    for user in users:
        user_data = FriendUserSerializer(user).data
        
        # Check if already friends
        is_friend = Friendship.objects.filter(
            Q(user1=request.user, user2=user) |
            Q(user1=user, user2=request.user)
        ).exists()
        
        user_data['is_friend'] = is_friend
        results.append(user_data)
    
    return Response(results)