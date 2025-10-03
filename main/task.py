from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Habit, HabitCheckin, Notification

@shared_task
def generate_habit_notifications():
    now = timezone.now()
    today = timezone.localdate()

    users_habits = Habit.objects.filter(active=True)

    for habit in users_habits:
        # Перевіряємо останній чекін
        last_checkin = habit.checkins.order_by('-date').first()
        missed_days = 0
        if last_checkin:
            missed_days = (today - last_checkin.date).days - 1

        # Якщо серія перервана
        if missed_days > 0:
            message = f"Ви втратили серію '{habit.name}'! Пропущено {missed_days} днів."
            Notification.objects.create(
                user=habit.user,
                message=message,
                send_web=True,
                send_telegram=True
            )
            continue

        # Обчислюємо час до кінця дня
        next_deadline = timezone.make_aware(
            timezone.datetime.combine(today + timedelta(days=1), timezone.datetime.min.time())
        )
        hours_to_deadline = (next_deadline - now).total_seconds() / 3600

        # Надсилаємо нагадування за 3,2,1,0.5 години до кінця серії
        if hours_to_deadline in [3, 2, 1, 0.5]:
            message = f"Ви не хочете втратити серію '{habit.name}'! Залишилось {int(hours_to_deadline*60)} хв."
            Notification.objects.create(
                user=habit.user,
                message=message,
                send_web=True,
                send_telegram=True
            )
