"""
Тести для Celery tasks
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from main.models import (
    Habit, HabitCheckin, TelegramProfile, 
    Notification, UserActivity
)
from main.tasks import (
    generate_habit_notifications,
    check_and_notify_broken_streaks,
    reset_daily_activity,
    cleanup_expired_password_resets
)


class GenerateHabitNotificationsTest(TestCase):
    """Тести для задачі генерації сповіщень про звички"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Створюємо Telegram профіль
        TelegramProfile.objects.create(
            user=self.user,
            telegram_id='123456789',
            connected=True,
            notifications_enabled=True
        )
        
        # Створюємо звичку
        self.habit = Habit.objects.create(
            user=self.user,
            name='Test Habit',
            frequency='daily',
            active=True,
            streak_days=5,
            last_checkin=timezone.now().date() - timedelta(days=1)
        )
    
    @patch('main.tasks.timezone.now')
    def test_generate_notifications_at_22_00(self, mock_now):
        """Тест генерації сповіщень о 22:00 (2 години до кінця дня)"""
        # Встановлюємо час 22:00
        test_time = timezone.now().replace(hour=22, minute=0, second=0)
        mock_now.return_value = test_time
        
        result = generate_habit_notifications()
        
        # Перевіряємо що сповіщення створено
        notifications = Notification.objects.filter(
            user=self.user,
            notification_type='streak_reminder'
        )
        self.assertGreater(notifications.count(), 0)
    
    @patch('main.tasks.timezone.now')
    def test_no_notifications_outside_active_period(self, mock_now):
        """Тест що сповіщення не генеруються поза активним періодом"""
        # Встановлюємо час 15:00
        test_time = timezone.now().replace(hour=15, minute=0, second=0)
        mock_now.return_value = test_time
        
        result = generate_habit_notifications()
        
        self.assertEqual(result, "Outside active period")
    
    def test_no_notifications_for_completed_habits(self):
        """Тест що сповіщення не надсилаються для виконаних звичок"""
        # Відмічаємо звичку як виконану сьогодні
        today = timezone.now().date()
        HabitCheckin.objects.create(
            habit=self.habit,
            date=today,
            completed=True
        )
        
        with patch('main.tasks.timezone.now') as mock_now:
            test_time = timezone.now().replace(hour=22, minute=0, second=0)
            mock_now.return_value = test_time
            
            initial_count = Notification.objects.count()
            generate_habit_notifications()
            final_count = Notification.objects.count()
            
            # Сповіщення не має бути створено
            self.assertEqual(initial_count, final_count)


class CheckAndNotifyBrokenStreaksTest(TestCase):
    """Тести для задачі перевірки обірваних streak"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        TelegramProfile.objects.create(
            user=self.user,
            telegram_id='123456789',
            connected=True,
            notifications_enabled=True
        )
    
    def test_notify_broken_streak(self):
        """Тест сповіщення про обірваний streak"""
        # Створюємо звичку з обірваним streak
        habit = Habit.objects.create(
            user=self.user,
            name='Test Habit',
            frequency='daily',
            active=True,
            streak_days=10,
            last_checkin=timezone.now().date() - timedelta(days=3)  # 3 дні тому
        )
        
        check_and_notify_broken_streaks()
        
        # Перевіряємо що сповіщення створено
        notifications = Notification.objects.filter(
            user=self.user,
            notification_type='streak_reminder'
        )
        self.assertGreater(notifications.count(), 0)
        
        notification = notifications.first()
        self.assertIn('lost', notification.message.lower())
    
    def test_no_notification_for_active_streak(self):
        """Тест що сповіщення не надсилається для активного streak"""
        # Створюємо звичку з активним streak
        habit = Habit.objects.create(
            user=self.user,
            name='Test Habit',
            frequency='daily',
            active=True,
            streak_days=5,
            last_checkin=timezone.now().date()  # Сьогодні
        )
        
        initial_count = Notification.objects.count()
        check_and_notify_broken_streaks()
        final_count = Notification.objects.count()
        
        # Сповіщення не має бути створено
        self.assertEqual(initial_count, final_count)


class ResetDailyActivityTest(TestCase):
    """Тести для задачі скидання щотижневої активності"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        from main.activity_tracker import get_monday_of_current_week
        
        # Створюємо старий запис активності
        old_week = get_monday_of_current_week() - timedelta(days=7)
        self.old_activity = UserActivity.objects.create(
            user=self.user,
            week_start=old_week,
            activity_count=50
        )
    
    def test_reset_old_activity(self):
        """Тест скидання старої активності"""
        reset_daily_activity()
        
        self.old_activity.refresh_from_db()
        self.assertEqual(self.old_activity.activity_count, 0)
    
    def test_keep_current_week_activity(self):
        """Тест що поточний тиждень не скидається"""
        from main.activity_tracker import get_monday_of_current_week
        
        current_activity = UserActivity.objects.create(
            user=self.user,
            week_start=get_monday_of_current_week(),
            activity_count=25
        )
        
        reset_daily_activity()
        
        current_activity.refresh_from_db()
        self.assertEqual(current_activity.activity_count, 25)


class CleanupExpiredPasswordResetsTest(TestCase):
    """Тести для задачі очищення застарілих запитів на скидання пароля"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_cleanup_expired_resets(self):
        """Тест очищення застарілих запитів"""
        from main.models import PendingPasswordReset
        
        # Створюємо застарілий запит
        expired_reset = PendingPasswordReset.objects.create(
            user=self.user,
            code='123456',
            telegram_id='123456789'
        )
        # Робимо його старим
        expired_reset.created_at = timezone.now() - timedelta(hours=2)
        expired_reset.save()
        
        cleanup_expired_password_resets()
        
        # Перевіряємо що запит видалено
        self.assertFalse(
            PendingPasswordReset.objects.filter(id=expired_reset.id).exists()
        )
    
    def test_keep_fresh_resets(self):
        """Тест що свіжі запити залишаються"""
        from main.models import PendingPasswordReset
        
        fresh_reset = PendingPasswordReset.objects.create(
            user=self.user,
            code='123456',
            telegram_id='123456789'
        )
        
        cleanup_expired_password_resets()
        
        # Перевіряємо що запит залишився
        self.assertTrue(
            PendingPasswordReset.objects.filter(id=fresh_reset.id).exists()
        )
