"""
Тести для моделей Django
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date
from main.models import (
    TelegramProfile, Habit, HabitCheckin, Goal, SubGoal,
    Notification, GoalTemplate, HabitTemplate, UserActivity
)


class TelegramProfileModelTest(TestCase):
    """Тести для моделі TelegramProfile"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_telegram_profile(self):
        """Тест створення Telegram профілю"""
        profile = TelegramProfile.objects.create(
            user=self.user,
            telegram_id='123456789',
            connected=True
        )
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.telegram_id, '123456789')
        self.assertTrue(profile.connected)
        self.assertTrue(profile.notifications_enabled)  # default
    
    def test_telegram_profile_str(self):
        """Тест строкового представлення профілю"""
        profile = TelegramProfile.objects.create(
            user=self.user,
            telegram_id='123456789',
            connected=True
        )
        self.assertEqual(str(profile), 'testuser - Connected')
    
    def test_bind_code_generation(self):
        """Тест генерації bind code"""
        profile = TelegramProfile.objects.create(
            user=self.user,
            bind_code='ABC123'
        )
        self.assertEqual(profile.bind_code, 'ABC123')
        self.assertFalse(profile.connected)


class HabitModelTest(TestCase):
    """Тести для моделі Habit"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.habit = Habit.objects.create(
            user=self.user,
            name='Morning Exercise',
            description='30 minutes of exercise',
            frequency='daily',
            active=True
        )
    
    def test_create_habit(self):
        """Тест створення звички"""
        self.assertEqual(self.habit.name, 'Morning Exercise')
        self.assertEqual(self.habit.user, self.user)
        self.assertEqual(self.habit.frequency, 'daily')
        self.assertEqual(self.habit.streak_days, 0)
        self.assertTrue(self.habit.active)
    
    def test_habit_str(self):
        """Тест строкового представлення звички"""
        self.assertEqual(str(self.habit), 'Morning Exercise')
    
    def test_is_checked_today_false(self):
        """Тест перевірки виконання звички сьогодні - не виконано"""
        self.assertFalse(self.habit.is_checked_today())
    
    def test_is_checked_today_true(self):
        """Тест перевірки виконання звички сьогодні - виконано"""
        today = timezone.now().date()
        HabitCheckin.objects.create(
            habit=self.habit,
            date=today,
            completed=True
        )
        self.assertTrue(self.habit.is_checked_today())
    
    def test_current_streak_zero_no_checkins(self):
        """Тест поточного streak без чекінів"""
        self.assertEqual(self.habit.current_streak, 0)
    
    def test_current_streak_today(self):
        """Тест поточного streak з чекіном сьогодні"""
        today = timezone.now().date()
        self.habit.last_checkin = today
        self.habit.streak_days = 5
        self.habit.save()
        self.assertEqual(self.habit.current_streak, 5)
    
    def test_current_streak_yesterday(self):
        """Тест поточного streak з чекіном вчора"""
        yesterday = timezone.now().date() - timedelta(days=1)
        self.habit.last_checkin = yesterday
        self.habit.streak_days = 3
        self.habit.save()
        self.assertEqual(self.habit.current_streak, 3)
    
    def test_current_streak_broken(self):
        """Тест обірваного streak (більше дня тому)"""
        two_days_ago = timezone.now().date() - timedelta(days=2)
        self.habit.last_checkin = two_days_ago
        self.habit.streak_days = 10
        self.habit.save()
        self.assertEqual(self.habit.current_streak, 0)
    
    def test_longest_streak(self):
        """Тест максимального streak"""
        self.habit.max_streak_days = 15
        self.habit.streak_days = 10
        self.habit.last_checkin = timezone.now().date()
        self.habit.save()
        self.assertEqual(self.habit.longest_streak, 15)
    
    def test_completion_rate(self):
        """Тест розрахунку відсотка виконання"""
        today = timezone.now().date()
        # Створюємо чекіни за останні 10 днів
        for i in range(10):
            date_obj = today - timedelta(days=i)
            HabitCheckin.objects.create(
                habit=self.habit,
                date=date_obj,
                completed=True
            )
        
        # Для daily звички за 30 днів completion_rate буде ~33% (10/30)
        rate = self.habit.completion_rate
        self.assertGreaterEqual(rate, 30)
        self.assertLessEqual(rate, 40)


class HabitCheckinModelTest(TestCase):
    """Тести для моделі HabitCheckin"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.habit = Habit.objects.create(
            user=self.user,
            name='Reading',
            frequency='daily'
        )
    
    def test_create_checkin(self):
        """Тест створення чекіну"""
        today = timezone.now().date()
        checkin = HabitCheckin.objects.create(
            habit=self.habit,
            date=today,
            completed=True
        )
        self.assertEqual(checkin.habit, self.habit)
        self.assertEqual(checkin.date, today)
        self.assertTrue(checkin.completed)


class GoalModelTest(TestCase):
    """Тести для моделі Goal"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_goal(self):
        """Тест створення цілі"""
        goal = Goal.objects.create(
            user=self.user,
            name='Learn Python',
            description='Complete Python course',
            due_date=timezone.now().date() + timedelta(days=30),
            category='education'
        )
        self.assertEqual(goal.name, 'Learn Python')
        self.assertEqual(goal.user, self.user)
        self.assertFalse(goal.completed)
    
    def test_goal_progress_no_subgoals(self):
        """Тест прогресу цілі без підцілей"""
        goal = Goal.objects.create(
            user=self.user,
            name='Test Goal'
        )
        self.assertEqual(goal.progress, 0)
    
    def test_goal_progress_with_subgoals(self):
        """Тест прогресу цілі з підцілями"""
        goal = Goal.objects.create(
            user=self.user,
            name='Test Goal'
        )
        SubGoal.objects.create(goal=goal, name='Subgoal 1', completed=True)
        SubGoal.objects.create(goal=goal, name='Subgoal 2', completed=False)
        SubGoal.objects.create(goal=goal, name='Subgoal 3', completed=True)
        
        # 2 з 3 виконано = 66.67%
        self.assertAlmostEqual(goal.progress, 66.67, places=1)


class SubGoalModelTest(TestCase):
    """Тести для моделі SubGoal"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.goal = Goal.objects.create(
            user=self.user,
            name='Main Goal'
        )
    
    def test_create_subgoal(self):
        """Тест створення підцілі"""
        subgoal = SubGoal.objects.create(
            goal=self.goal,
            name='First Step',
            description='Initial step'
        )
        self.assertEqual(subgoal.goal, self.goal)
        self.assertEqual(subgoal.name, 'First Step')
        self.assertFalse(subgoal.completed)


class NotificationModelTest(TestCase):
    """Тести для моделі Notification"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_notification(self):
        """Тест створення сповіщення"""
        notification = Notification.objects.create(
            user=self.user,
            message='Test notification',
            notification_type='streak_reminder',
            send_web=True,
            send_telegram=False
        )
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.message, 'Test notification')
        self.assertFalse(notification.is_read)
        self.assertFalse(notification.web_sent)
        self.assertFalse(notification.telegram_sent)


class UserActivityModelTest(TestCase):
    """Тести для моделі UserActivity"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_user_activity(self):
        """Тест створення запису активності"""
        from main.activity_tracker import get_monday_of_current_week
        
        activity = UserActivity.objects.create(
            user=self.user,
            week_start=get_monday_of_current_week()
        )
        self.assertEqual(activity.user, self.user)
        self.assertEqual(activity.activity_count, 0)
    
    def test_increment_activity(self):
        """Тест збільшення активності"""
        from main.activity_tracker import get_monday_of_current_week
        
        activity = UserActivity.objects.create(
            user=self.user,
            week_start=get_monday_of_current_week()
        )
        activity.increment()
        self.assertEqual(activity.activity_count, 1)
        
        activity.increment()
        self.assertEqual(activity.activity_count, 2)
    
    def test_reset_week(self):
        """Тест скидання тижневої активності"""
        from main.activity_tracker import get_monday_of_current_week
        
        activity = UserActivity.objects.create(
            user=self.user,
            week_start=get_monday_of_current_week()
        )
        activity.activity_count = 50
        activity.save()
        
        activity.reset_week()
        self.assertEqual(activity.activity_count, 0)
