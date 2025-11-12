"""
Тестовый скрипт для проверки системы уведомлений
Вызывает тестовую задачу Celery для проверки привычек всех пользователей
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')
django.setup()

from main.models import User, Habit, HabitCheckin
from main.tasks import test_generate_habit_notifications
from datetime import datetime, date, timedelta

def test_real_notification():
    try:
        print("📊 Проверяю активных пользователей с привычками...")
        
        # Показываем всех пользователей с активными привычками
        users_with_habits = User.objects.filter(habits__active=True).distinct()
        print(f"✅ Найдено пользователей с активными привычками: {users_with_habits.count()}")
        
        for user in users_with_habits:
            active_habits = user.habits.filter(active=True)
            incomplete_count = sum(1 for h in active_habits if not h.is_checked_today())
            status = "✅ все выполнены" if incomplete_count == 0 else f"⚠️ {incomplete_count} невыполнено"
            print(f"  - {user.username} (ID: {user.id}): {active_habits.count()} привычек, {status}")
        
        print("\n🚀 Запускаю ТЕСТОВУЮ задачу для ВСЕХ пользователей через Celery...")
        print("⚠️ Эта задача НЕ проверяет время - работает всегда!")
        print("🎯 Отправка ВСЕМ пользователям с невыполненными привычками")
        
        # Вызываем тестовую задачу БЕЗ user_id - для всех пользователей
        task_result = test_generate_habit_notifications.delay()
        
        print(f"\n✅ Задача отправлена в Celery worker")
        print(f"📝 Task ID: {task_result.id}")
        print(f"⏳ Состояние: {task_result.state}")
        
        print("\n" + "="*60)
        print("✅ ЗАДАЧА УСПЕШНО ЗАПУЩЕНА!")
        print("="*60)
        print("💡 Celery worker должен:")
        print("   1. Проверить привычки ВСЕХ пользователей")
        print("   2. Создать уведомления для тех, у кого есть невыполненные")
        print("   3. Отправить через WebSocket (если InMemory)")
        print("   4. Уведомления появятся через polling (21:00-00:01)")
        print("="*60)
        print("\n⏰ Если сейчас 21:00-00:01 - уведомление появится за 30 сек!")
        print("⏰ Если другое время - открой dropdown вручную для загрузки")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 ТЕСТ РЕАЛЬНОЙ СИСТЕМЫ УВЕДОМЛЕНИЙ (ВСЕ ПОЛЬЗОВАТЕЛИ)")
    print("="*60 + "\n")
    test_real_notification()
