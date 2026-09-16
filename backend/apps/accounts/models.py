from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Replaces the flat, plaintext-PIN user list in the old Users sheet.
    ``username`` is the login identifier for every role (an email for
    Admin/IIF staff, the school's assigned username for School accounts).
    Passwords are hashed by Django's PBKDF2/argon2 hasher -- never stored or
    logged in plaintext.
    """

    ADMIN = "admin"
    IIF_STAFF = "iif_staff"
    SCHOOL = "school"
    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (IIF_STAFF, "IIF Staff"),
        (SCHOOL, "School"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    school = models.ForeignKey(
        "schools.School",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        help_text="Set only for role=school; the account is scoped to this school.",
    )
    display_name = models.CharField(max_length=150, blank=True)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"
