from __future__ import annotations

from typing import Any

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from apps.common.models import (
    AllObjectsManager,
    SoftDeleteModel,
    TimeStampedModel,
    UUIDModel,
    VersionedModel,
)


def normalize_email_for_comparison(email: str) -> str:
    return email.strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def get_by_natural_key(self, username: str):
        return self.get(
            **{self.model.USERNAME_FIELD: normalize_email_for_comparison(username)}
        )

    def create_user(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: Any,
    ):
        if not email:
            raise ValueError("email is required")
        original_email = email.strip()
        user = self.model(
            email=original_email,
            normalized_email=normalize_email_for_comparison(original_email),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        normalized_email: str,
        password: str | None = None,
        **extra_fields: Any,
    ):
        email = extra_fields.pop("email", normalized_email)
        extra_fields.setdefault("display_name", "Administrator")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class UserStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    DELETED = "DELETED", "Deleted"


class WeekStartsOn(models.TextChoices):
    MONDAY = "MONDAY", "Monday"
    SUNDAY = "SUNDAY", "Sunday"


class TimeFormat(models.TextChoices):
    H24 = "H24", "24-hour"
    H12 = "H12", "12-hour"


class User(
    UUIDModel,
    TimeStampedModel,
    VersionedModel,
    SoftDeleteModel,
    AbstractBaseUser,
    PermissionsMixin,
):
    email = models.EmailField(max_length=254)
    normalized_email = models.EmailField(max_length=254, unique=True, editable=False)
    display_name = models.CharField(max_length=100)
    family_name = models.CharField(max_length=100, blank=True, default="")
    given_name = models.CharField(max_length=100, blank=True, default="")
    phone_number = models.CharField(max_length=32, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    timezone = models.CharField(max_length=64, default="Asia/Tokyo")
    week_starts_on = models.CharField(
        max_length=10,
        choices=WeekStartsOn.choices,
        default=WeekStartsOn.MONDAY,
    )
    time_format = models.CharField(
        max_length=3,
        choices=TimeFormat.choices,
        default=TimeFormat.H24,
    )
    compact_mode = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    token_valid_after = models.DateTimeField(null=True, blank=True)

    objects = UserManager()
    all_objects = AllObjectsManager()

    USERNAME_FIELD = "normalized_email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["status"], name="users_status_idx")]

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.email = self.email.strip()
        self.normalized_email = normalize_email_for_comparison(self.email)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.email
