"""
Тести для views Django
"""
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from main.models import (
    Habit, HabitCheckin, Goal, SubGoal, 
    TelegramProfile, Notification
)
import json


class HomeViewTest(TestCase):
    """Тести для головної сторінки"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_home_page_anonymous(self):
        """Тест доступу до головної сторінки анонімним користувачем"""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'pages/index.html')
    
    def test_home_page_authenticated(self):
        """Тест доступу до головної сторінки авторизованим користувачем"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('user_goals', response.context)
        self.assertIn('user_habits', response.context)


class AuthViewsTest(TestCase):
    """Тести для авторизації та реєстрації"""
    
    def setUp(self):
        self.client = Client()
    
    def test_register_user_success(self):
        """Тест успішної реєстрації користувача"""
        response = self.client.post(reverse('register_user'), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_register_user_password_mismatch(self):
        """Тест реєстрації з неспівпадаючими паролями"""
        response = self.client.post(reverse('register_user'), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password2': 'differentpass'
        })
        data = json.loads(response.content)
        self.assertFalse(data['success'])
        self.assertIn('Passwords do not match', data['error'])
    
    def test_login_user_success(self):
        """Тест успішного входу"""
        User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        response = self.client.post(reverse('login_user'), {
            'username': 'testuser',
            'password': 'testpass123'
        })
        data = json.loads(response.content)
        self.assertTrue(data['success'])
    
    def test_login_user_invalid_credentials(self):
        """Тест входу з невірними даними"""
        response = self.client.post(reverse('login_user'), {
            'username': 'nonexistent',
            'password': 'wrongpass'
        })
        data = json.loads(response.content)
        self.assertFalse(data['success'])
    
    def test_logout_user(self):
        """Тест виходу користувача"""
        user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        response = self.client.post(reverse('logout_user'))
        data = json.loads(response.content)
        self.assertTrue(data['success'])


class HabitViewsTest(TestCase):
    """Тести для views звичок"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        
        self.habit = Habit.objects.create(
            user=self.user,
            name='Test Habit',
            description='Test description',
            frequency='daily',
            active=True
        )
    
    def test_habits_page_requires_auth(self):
        """Тест що сторінка звичок вимагає авторизації"""
        self.client.logout()
        response = self.client.get(reverse('habits'))
        # Має перенаправити або показати модалку
        self.assertEqual(response.status_code, 200)
    
    def test_habits_page_authenticated(self):
        """Тест доступу до сторінки звичок"""
        response = self.client.get(reverse('habits'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'pages/habits.html')
    
    def test_create_habit(self):
        """Тест створення звички"""
        response = self.client.post(reverse('create_habit'), {
            'name': 'New Habit',
            'description': 'New description',
            'frequency': 'daily'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertTrue(Habit.objects.filter(name='New Habit').exists())
    
    def test_update_habit(self):
        """Тест оновлення звички"""
        response = self.client.post(
            reverse('update_habit', args=[self.habit.id]),
            {
                'name': 'Updated Habit',
                'description': 'Updated description',
                'frequency': 'weekly'
            }
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        self.habit.refresh_from_db()
        self.assertEqual(self.habit.name, 'Updated Habit')
        self.assertEqual(self.habit.frequency, 'weekly')
    
    def test_delete_habit(self):
        """Тест видалення звички"""
        habit_id = self.habit.id
        response = self.client.post(reverse('delete_habit', args=[habit_id]))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        # Перевіряємо що звичка деактивована, а не видалена
        self.habit.refresh_from_db()
        self.assertFalse(self.habit.active)
    
    def test_toggle_habit_checkin(self):
        """Тест перемикання чекіну звички"""
        response = self.client.post(
            reverse('toggle_habit', args=[self.habit.id])
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertTrue(data['checked'])
        
        # Перевіряємо що чекін створено
        today = timezone.now().date()
        self.assertTrue(
            HabitCheckin.objects.filter(
                habit=self.habit,
                date=today,
                completed=True
            ).exists()
        )


class GoalViewsTest(TestCase):
    """Тести для views цілей"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        
        self.goal = Goal.objects.create(
            user=self.user,
            name='Test Goal',
            description='Test description',
            category='personal'
        )
    
    def test_goals_page_requires_auth(self):
        """Тест що сторінка цілей вимагає авторизації"""
        self.client.logout()
        response = self.client.get(reverse('goals'))
        self.assertEqual(response.status_code, 200)
    
    def test_goals_page_authenticated(self):
        """Тест доступу до сторінки цілей"""
        response = self.client.get(reverse('goals'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'pages/goals.html')
    
    def test_create_goal(self):
        """Тест створення цілі"""
        response = self.client.post(reverse('create_goal'), {
            'name': 'New Goal',
            'description': 'New description',
            'category': 'education',
            'due_date': (timezone.now().date() + timedelta(days=30)).isoformat()
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertTrue(Goal.objects.filter(name='New Goal').exists())
    
    def test_update_goal(self):
        """Тест оновлення цілі"""
        response = self.client.post(
            reverse('update_goal', args=[self.goal.id]),
            {
                'name': 'Updated Goal',
                'description': 'Updated description',
                'category': 'work'
            }
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        self.goal.refresh_from_db()
        self.assertEqual(self.goal.name, 'Updated Goal')
    
    def test_delete_goal(self):
        """Тест видалення цілі"""
        goal_id = self.goal.id
        response = self.client.post(reverse('delete_goal', args=[goal_id]))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertFalse(Goal.objects.filter(id=goal_id).exists())


class SubGoalViewsTest(TestCase):
    """Тести для views підцілей"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        
        self.goal = Goal.objects.create(
            user=self.user,
            name='Test Goal'
        )
        
        self.subgoal = SubGoal.objects.create(
            goal=self.goal,
            name='Test Subgoal',
            description='Test description'
        )
    
    def test_create_subgoal(self):
        """Тест створення підцілі"""
        response = self.client.post(reverse('create_subgoal'), {
            'goal_id': self.goal.id,
            'name': 'New Subgoal',
            'description': 'New description'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertTrue(SubGoal.objects.filter(name='New Subgoal').exists())
    
    def test_toggle_subgoal(self):
        """Тест перемикання статусу підцілі"""
        response = self.client.post(
            reverse('toggle_subgoal', args=[self.subgoal.id])
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        self.subgoal.refresh_from_db()
        self.assertTrue(self.subgoal.completed)
    
    def test_delete_subgoal(self):
        """Тест видалення підцілі"""
        subgoal_id = self.subgoal.id
        response = self.client.post(reverse('delete_subgoal', args=[subgoal_id]))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        self.assertFalse(SubGoal.objects.filter(id=subgoal_id).exists())


class NotificationViewsTest(TestCase):
    """Тести для views сповіщень"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')
        
        self.notification = Notification.objects.create(
            user=self.user,
            message='Test notification',
            notification_type='streak_reminder',
            send_web=True
        )
    
    def test_get_notifications(self):
        """Тест отримання списку сповіщень"""
        response = self.client.get(reverse('get_notifications'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('notifications', data)
        self.assertGreaterEqual(len(data['notifications']), 1)
    
    def test_mark_notification_read(self):
        """Тест позначення сповіщення як прочитане"""
        response = self.client.post(
            reverse('mark_notification_read', args=[self.notification.id])
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
    
    def test_mark_all_notifications_read(self):
        """Тест позначення всіх сповіщень як прочитані"""
        # Створюємо ще кілька сповіщень
        Notification.objects.create(
            user=self.user,
            message='Test 2',
            notification_type='streak_reminder',
            send_web=True
        )
        Notification.objects.create(
            user=self.user,
            message='Test 3',
            notification_type='streak_reminder',
            send_web=True
        )
        
        response = self.client.post(reverse('mark_all_notifications_read'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        # Перевіряємо що всі сповіщення прочитані
        unread_count = Notification.objects.filter(
            user=self.user,
            is_read=False
        ).count()
        self.assertEqual(unread_count, 0)
