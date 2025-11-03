from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class TelegramProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='telegram_profile')
    telegram_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    connected = models.BooleanField(default=False)
    notifications_enabled = models.BooleanField(default=True) 
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
    
    def is_checked_today(self):
        """Перевіряє, чи відмічена привычка сьогодні"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.checkins.filter(date=today, completed=True).exists()
    
    @property
    def current_streak(self):
        """Повертає поточну серію днів"""
        return self.streak_days


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

    def get_progress_percent(self):
        """Розраховує відсоток виконання цілі на основі завершених підцілей"""
        total_subgoals = self.subgoals.count()
        if total_subgoals == 0:
            return 0
        completed_subgoals = self.subgoals.filter(completed=True).count()
        return round((completed_subgoals / total_subgoals) * 100)

    def get_completed_subgoals_count(self):
        """Повертає кількість завершених підцілей"""
        return self.subgoals.filter(completed=True).count()

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
    
    
class SubGoalTemplate(models.Model):
    template = models.ForeignKey(GoalTemplate, on_delete=models.CASCADE, related_name='subgoals')
    name = models.CharField(max_length=100)

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
        return self.send_telegram and profile and profile.connected and profile.notifications_enabled


class Pending2FA(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    telegram_id = models.CharField(max_length=50)
    telegram_message_id = models.CharField(max_length=50, null=True, blank=True)  # ID сообщения в Telegram
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)
    declined = models.BooleanField(default=False)  # Поле для отклоненных запросов


class UserActivity(models.Model):
    """Модель для трекинга активності користувача по дням тижня"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='activity')
    
    # Активність по дням тижня (0 = Понеділок, 6 = Неділя)
    monday = models.IntegerField(default=0)
    tuesday = models.IntegerField(default=0)
    wednesday = models.IntegerField(default=0)
    thursday = models.IntegerField(default=0)
    friday = models.IntegerField(default=0)
    saturday = models.IntegerField(default=0)
    sunday = models.IntegerField(default=0)

    # Мета-інформація
    week_start = models.DateField(default=timezone.now)  # Початок поточного тижня
    total_activities = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - Week {self.week_start} (Total: {self.total_activities})"
    
    def get_day_activity(self, day_name):
        """Отримати активність за конкретний день"""
        day_mapping = {
            'monday': self.monday,
            'tuesday': self.tuesday,
            'wednesday': self.wednesday,
            'thursday': self.thursday,
            'friday': self.friday,
            'saturday': self.saturday,
            'sunday': self.sunday,
        }
        return day_mapping.get(day_name.lower(), 0)
    
    def add_activity(self, day_name, amount=1):
        """Добавити активність за конкретний день"""
        day_mapping = {
            'monday': 'monday',
            'tuesday': 'tuesday', 
            'wednesday': 'wednesday',
            'thursday': 'thursday',
            'friday': 'friday',
            'saturday': 'saturday',
            'sunday': 'sunday',
        }
        
        field_name = day_mapping.get(day_name.lower())
        if field_name:
            current_value = getattr(self, field_name)
            setattr(self, field_name, current_value + amount)
            self.total_activities += amount
            self.save()
    
    def get_weekly_data(self):
        """Отримати дані тижня в форматі для чарта"""
        return [
            self.monday, self.tuesday, self.wednesday,
            self.thursday, self.friday, self.saturday, self.sunday
        ]
    
    def reset_week(self):
        """Скинути дані тижня"""
        self.monday = self.tuesday = self.wednesday = 0
        self.thursday = self.friday = self.saturday = self.sunday = 0
        self.total_activities = 0
        self.week_start = timezone.now().date()
        self.save()


class TechAdmin(models.Model):
    """Тех адміністратори системи"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tech_admin')
    is_active = models.BooleanField(default=True, help_text="Активний тех адміністратор")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tech_admins')
    
    class Meta:
        verbose_name = "Тех адміністратор"
        verbose_name_plural = "Тех адміністратори"

    def __str__(self):
        status = "Активний" if self.is_active else "Неактивний"
        return f"{self.user.username} ({status})"


class SupportMessage(models.Model):
    """Модель повідомлень у технічну підтримку"""
    STATUS_CHOICES = [
        ('new', 'Новий'),
        ('in_progress', 'В процесі'),
        ('resolved', 'Вирішено'),
        ('closed', 'Закрито'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низький'),
        ('medium', 'Середній'),
        ('high', 'Високий'),
        ('urgent', 'Срочний'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_messages', null=True, blank=True)
    subject = models.CharField(max_length=200, verbose_name="Тема")
    message = models.TextField(verbose_name="Повідомлення")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', verbose_name="Статус")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium', verbose_name="Приорітет")

    # Інформація про проблему
    problem_type = models.CharField(max_length=50, default='2fa_help', verbose_name="Тип проблеми")
    user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent")
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name="IP адрес")

    # Дати
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")
    resolved_at = models.DateTimeField(blank=True, null=True, verbose_name="Вирішено")

    # Хто обробляє
    assigned_to = models.ForeignKey(TechAdmin, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_messages', verbose_name="Призначено")
    admin_notes = models.TextField(blank=True, null=True, verbose_name="Заметки адміністратора")

    class Meta:
        verbose_name = "Повідомлення в підтримку"
        verbose_name_plural = "Повідомлення в підтримку"
        ordering = ['-created_at']
        
    def __str__(self):
        user_display = self.user.username if self.user else "Guest User"
        return f"{user_display}: {self.subject[:50]} ({self.get_status_display()})"
    
    def mark_resolved(self, admin_user=None):
        """Відзначити повідомлення як решене"""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        if admin_user and hasattr(admin_user, 'tech_admin'):
            self.assigned_to = admin_user.tech_admin
        self.save()


class PendingPasswordReset(models.Model):
    """Модель для відстеження очікуваних скидань пароля через Telegram"""
    telegram_id = models.CharField(max_length=50, verbose_name="Telegram ID")
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="User")
    new_password = models.CharField(max_length=255, blank=True, null=True, verbose_name="New Password")
    is_confirmed = models.BooleanField(default=False, verbose_name="Confirmed")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    expires_at = models.DateTimeField(verbose_name="Expires At")

    class Meta:
        verbose_name = "Password Reset"
        verbose_name_plural = "Password Resets"

    def __str__(self):
        return f"Password reset for {self.user.username} via Telegram"
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @classmethod
    def cleanup_expired(cls):
        """Удаляет истекшие запросы на сброс пароля"""
        from django.utils import timezone
        expired_count = cls.objects.filter(expires_at__lt=timezone.now()).count()
        cls.objects.filter(expires_at__lt=timezone.now()).delete()
        return expired_count

