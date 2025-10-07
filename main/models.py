from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class TelegramProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='telegram_profile')
    telegram_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    connected = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    bind_code = models.CharField(max_length=6, null=True, blank=True)

    def __str__(self):
        status = 'Connected' if self.connected else 'Not connected'
        return f"{self.user.username} - {status}"


class Habit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    streak_days = models.IntegerField(default=0)
    last_checkin = models.DateField(null=True, blank=True)
    frequency = models.CharField(
        max_length=20,
        choices=[('daily','Daily'), ('weekly','Weekly')]
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class HabitCheckin(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='checkins')
    date = models.DateField()
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)



    class Meta:
        unique_together = ('habit', 'date')
        

class HabitTemplate(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    frequency = models.CharField(
        max_length=20,
        choices=[('daily','Daily'), ('weekly','Weekly')]
    )

    def __str__(self):
        return self.name


class Goal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    deadline = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    notify_before_days = models.IntegerField(default=1)


    def __str__(self):
        return self.name


class SubGoal(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='subgoals')
    name = models.CharField(max_length=100)
    completed = models.BooleanField(default=False)
    notify_before_days = models.IntegerField(default=1)

    

class GoalTemplate(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    send_web = models.BooleanField(default=True)
    send_telegram = models.BooleanField(default=False)
    type = models.CharField(max_length=50, default="general")


    def __str__(self):
      preview = self.message if len(self.message) <= 50 else self.message[:50] + "..."
      return f"{self.user.username}: {preview}"

    def should_send_telegram(self):
        profile = getattr(self.user, 'telegram_profile', None)
        return self.send_telegram and profile and profile.connected


class Pending2FA(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    telegram_id = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)

