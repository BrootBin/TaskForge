# myapp/notifications.py
from datetime import date
from .models import Habit, HabitCheckin, Notification

def check_user_habits(user):
    for habit in user.habits.filter(active=True):
        last_checkin = habit.checkins.order_by('-date').first()
        today = date.today()

        if last_checkin and (today - last_checkin.date).days > 1:
            message = f"Ви втратили серію у звичці «{habit.name}»!"
            Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
        
        elif last_checkin and (today - last_checkin.date).days == 0:
            streak_length = habit.checkins.filter(completed=True).count()
            message = f"Ви не хочете втратити вашу {streak_length}-денну серію у «{habit.name}»?"
            Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
