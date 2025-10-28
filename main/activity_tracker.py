"""
Утиліта для трекінгу активності користувачів за тиждень.
"""
from django.utils import timezone
from .models import UserActivity
import datetime


def get_current_weekday_name():
    """Отримати назву поточного дня тижня"""
    weekdays = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
    ]
    today = timezone.now().weekday()  # 0 = понеділок, 6 = неділя
    return weekdays[today]


def track_user_activity(user, activity_type="general", amount=1):
    """
    Трекаємо активність користувача
    
    Args:
        user: Django User об'єкт
        activity_type: тип активності (goal_completed, subgoal_completed, habit_checkin, login)
        amount: кількість активності (за замовчуванням 1)
    """
    # Отримуємо або створюємо запис активності користувача
    activity, created = UserActivity.objects.get_or_create(
        user=user,
        defaults={
            'week_start': get_monday_of_current_week()
        }
    )

    # Перевіряємо, чи потрібно скинути тиждень
    if should_reset_week(activity.week_start):
        activity.reset_week()

    # Додаємо активність за сьогоднішній день
    current_day = get_current_weekday_name()
    activity.add_activity(current_day, amount)
    
    print(f"📊 Activity tracked: {user.username} - {activity_type} on {current_day} (+{amount})")


def get_monday_of_current_week():
    """Отримати понеділок поточного тижня"""
    today = timezone.now().date()
    monday = today - datetime.timedelta(days=today.weekday())
    return monday


def should_reset_week(week_start):
    """Перевірити, чи потрібно скинути тиждень"""
    current_monday = get_monday_of_current_week()
    return week_start < current_monday


def get_user_weekly_activity(user):
    """Отримати дані активності користувача за тиждень"""
    try:
        activity = UserActivity.objects.get(user=user)

        # Перевіряємо, чи потрібно скинути тиждень
        if should_reset_week(activity.week_start):
            activity.reset_week()
            
        return {
            'weekly_data': activity.get_weekly_data(),
            'total_activities': activity.total_activities,
            'week_start': activity.week_start.strftime('%Y-%m-%d'),
            'labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        }
    except UserActivity.DoesNotExist:
        # Створюємо порожню активність якщо не існує
        activity = UserActivity.objects.create(
            user=user,
            week_start=get_monday_of_current_week()
        )
        return {
            'weekly_data': [0, 0, 0, 0, 0, 0, 0],
            'total_activities': 0,
            'week_start': activity.week_start.strftime('%Y-%m-%d'),
            'labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        }