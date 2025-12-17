from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'rating',
            'games_played',
            'games_won',
            'games_lost',
            'games_drawn',
            'win_rate',
            'avatar',
            'country',
            'bio',
            'is_online',
            'last_seen',
            'date_joined',
            'is_email_verified',
            'registration_method',
        ]
        read_only_fields = [
            'id',
            'rating',
            'games_played',
            'games_won',
            'games_lost',
            'games_drawn',
            'win_rate',
            'date_joined',
            'is_email_verified',
            'registration_method',
        ]



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'username']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })

        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                "email": "Email already registered."
            })

        username = attrs.get('username')
        if username and User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                "username": "Username already taken."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')

        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            username=validated_data.get('username'),
            registration_method='email',
            is_email_verified=False,
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    def validate_old_password(self, value):
        user = self.context['request'].user

        if user.registration_method != 'email':
            raise serializers.ValidationError(
                "Password change not allowed for OAuth accounts."
            )

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Old password is incorrect."
            )

        return value



class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'avatar', 'country', 'bio']


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth token"""
    token = serializers.CharField(required=True)