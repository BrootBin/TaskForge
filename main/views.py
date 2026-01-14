from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from .models import Notification, TelegramProfile, Pending2FA, SubGoal, Goal, Habit, HabitCheckin
from .tasks import send_2fa_request
from .activity_tracker import track_user_activity, get_user_weekly_activity
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from functools import wraps
import random
import json
import os


def auth_required_with_modal(view_func):
    """
    Декоратор для перевірки аутентифікації.
    Якщо користувач не аутентифікований, показує головну сторінку з відкритою модалкою реєстрації.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            # Повертаємо головну сторінку з прапорцем для відкриття модалки
            response = render(request, 'pages/index.html', {
                'show_auth_modal': True,
                'auth_modal_tab': 'register',  # Відкриваємо вкладку реєстрації
            })
            return response
        return view_func(request, *args, **kwargs)
    return wrapper

def home(request):
    print(f"Home view called. User authenticated: {request.user.is_authenticated}")
    if request.user.is_authenticated:
        print(f"Authenticated user: {request.user.username}")
    
    telegram_code = None
    telegram_notify_enabled = False
    two_factor_enabled = False
    telegram_connected = False
    
    # Починаємо без цілей та звичок
    user_goals = None
    user_habits = None
    template_goals = None
    template_habits = None
    
    if request.user.is_authenticated:
        # Отримуємо інформацію профілю Telegram
        profile = getattr(request.user, 'telegram_profile', None)
        if profile:
            print(f"🔍 Profile debug: connected={profile.connected}, telegram_id={profile.telegram_id}, bind_code={profile.bind_code}")
            # Якщо обліковий запис підключено, не показуємо bind_code
            telegram_code = None if (profile.connected and profile.telegram_id) else profile.bind_code
            # Виправляємо: використовуємо правильне поле для сповіщень
            telegram_notify_enabled = profile.notifications_enabled if (profile.connected and profile.telegram_id) else False
            two_factor_enabled = profile.two_factor_enabled
            telegram_connected = profile.connected and profile.telegram_id is not None
            print(f"🔍 Final values: telegram_code={telegram_code}, telegram_connected={telegram_connected}")
        else:
            print(f"⚠️ No Telegram profile found for user {request.user.username}")
        
        # Отримуємо цілі та звички користувача або шаблони, якщо їх немає
        from .models import Goal, SubGoal, Habit, GoalTemplate, HabitTemplate
        
        # Отримуємо активні цілі з підцілями
        user_goals = Goal.objects.filter(user=request.user, completed=False).prefetch_related('subgoals')
        
        # Якщо у користувача немає своїх цілей, отримуємо шаблони цілей
        if not user_goals.exists():
            template_goals = GoalTemplate.objects.all()[:3] 
        
        # Отримання активних звичок користувача
        user_habits = Habit.objects.filter(user=request.user, active=True)
        
        # Якщо у користувача немає своїх звичок, отримуємо шаблони звичок
        if not user_habits.exists():
            template_habits = HabitTemplate.objects.all()[:3]  
    
    return render(request, 'pages/index.html', {
        'telegram_code': telegram_code,
        'telegram_notify_enabled': telegram_notify_enabled,
        'two_factor_enabled': two_factor_enabled,
        'telegram_connected': telegram_connected,
        'user_goals': user_goals,
        'template_goals': template_goals,
        'user_habits': user_habits,
        'template_habits': template_habits,
    })


@auth_required_with_modal
def goals_page(request):
    """Строрінка керування цілями користувача"""
    from .models import Goal, SubGoal, GoalTemplate
    
    # Получаемо всі цілі користувача
    user_goals = Goal.objects.filter(user=request.user).prefetch_related('subgoals').order_by('-created_at')

    # Получаем шаблоны цілей для створення нових
    goal_templates = GoalTemplate.objects.all()

    # Статистика цілей
    total_goals = user_goals.count()
    completed_goals = user_goals.filter(completed=True).count()
    active_goals = user_goals.filter(completed=False).count()
    
    # Прогресс всіх активних цілей
    total_progress = 0
    active_goals_with_subgoals = user_goals.filter(completed=False)
    if active_goals_with_subgoals.exists():
        for goal in active_goals_with_subgoals:
            total_progress += goal.get_progress_percent()
        average_progress = total_progress / active_goals_with_subgoals.count()
    else:
        average_progress = 0

    return render(request, 'pages/goals.html', {
        'user_goals': user_goals,
        'goal_templates': goal_templates,
        'total_goals': total_goals,
        'completed_goals': completed_goals,
        'active_goals': active_goals,
        'average_progress': round(average_progress, 1),
    })

@auth_required_with_modal
def habits_page(request):
    """Сторінка управління звичками користувача"""
    from .models import Habit, HabitTemplate
    from django.utils import timezone
    from datetime import datetime, timedelta
    
    # Получаемо всі звички користувача
    user_habits = Habit.objects.filter(user=request.user).order_by('-created_at')

    # Отримуємо шаблони звичок для створення нових
    habit_templates = HabitTemplate.objects.all()

    # Статистика звичек
    total_habits = user_habits.count()
    active_habits = user_habits.filter(active=True).count()
    
   # Звички, відзначені сьогодні
    today = timezone.now().date()
    completed_today = 0
    current_streak = 0
    
    for habit in user_habits.filter(active=True):
        if habit.is_checked_today():
            completed_today += 1
        current_streak = max(current_streak, habit.current_streak)

    return render(request, 'pages/habits.html', {
        'user_habits': user_habits,
        'habit_templates': habit_templates,
        'total_habits': total_habits,
        'active_habits': active_habits,
        'completed_today': completed_today,
        'current_streak': current_streak,
        'today': today,
    })


@login_required
@require_http_methods(["GET"])
def get_habits_stats(request):
    """API для отримання оновленої статистики звичок"""
    try:
        from .models import Habit
        from django.utils import timezone
        
        user_habits = Habit.objects.filter(user=request.user)
        
        # Статистика звичок
        total_habits = user_habits.count()
        active_habits = user_habits.filter(active=True).count()
        
        # Звички, відзначені сьогодні
        today = timezone.now().date()
        completed_today = 0
        current_streak = 0
        
        for habit in user_habits.filter(active=True):
            if habit.is_checked_today():
                completed_today += 1
            current_streak = max(current_streak, habit.current_streak)
        
        stats = {
            'total_habits': total_habits,
            'active_habits': active_habits,
            'completed_today': completed_today,
            'current_streak': current_streak
        }
        
        return JsonResponse({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_user_habits(request):
    """API для отримання списку звичок користувача"""
    try:
        from .models import Habit
        from django.utils import timezone
        
        user_habits = Habit.objects.filter(user=request.user).order_by('-created_at')
        today = timezone.now().date()
        
        habits_data = []
        for habit in user_habits:
            habits_data.append({
                'id': habit.id,
                'name': habit.name,
                'description': habit.description,
                'frequency_display': habit.get_frequency_display(),
                'active': habit.active,
                'is_checked_today': habit.is_checked_today(),
                'current_streak': habit.current_streak,
                'longest_streak': habit.longest_streak,
                'completion_rate': habit.completion_rate,
                'today_date': today.strftime("%B %d")
            })
        
        return JsonResponse({
            "status": "success",
            "habits": habits_data
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm")

        # Перевіряємо, якщо це запит AJAX
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', '')

        if password != confirm:
            messages.error(request, "The passwords do not match")
            if is_ajax:
                return JsonResponse({"success": False, "error": "Passwords do not match"})
            return redirect("home")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            if is_ajax:
                return JsonResponse({"success": False, "error": "Username already taken"})
            return redirect("home")

        user = User.objects.create_user(username=username, password=password)
        bind_code = f"{random.randint(100000, 999999)}"
        TelegramProfile.objects.create(user=user, bind_code=bind_code)
        login(request, user)
        
        if is_ajax:
            return JsonResponse({"success": True, "message": "Registration successful!"})
        return redirect("home")
    
    return redirect("home")

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)

        # Перевіряємо, якщо це запит AJAX
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', '')

        if user is None:
            messages.error(request, "Incorrect username or password.")
            if is_ajax:
                return JsonResponse({"success": False, "error": "Incorrect username or password"})
            return render(request, "base.html", {
                'telegram_code': None,
                'telegram_notify_enabled': False,
                'two_factor_enabled': False,
                'telegram_connected': False
            })

        profile = getattr(user, 'telegram_profile', None)
        print(f"👤 User profile found: {profile is not None}")
        if profile:
            print(f"📱 Profile connected: {profile.connected}")
            print(f"🔒 2FA enabled: {profile.two_factor_enabled}")
            print(f"📞 Telegram ID: {profile.telegram_id}")

        if profile and profile.two_factor_enabled:
            print(f"🔐 2FA is enabled for user {user.username}, proceeding with 2FA flow...")
            # Спочатку перевіряємо, чи є вже підтверджений запит
            pending_confirmed = Pending2FA.objects.filter(user=user, confirmed=True).first()
            if pending_confirmed:
                login(request, user)
                pending_confirmed.delete()
                messages.success(request, "Login successful!")
                return redirect("home")

            # Якщо підтвердженого немає, створюємо новий запит (якщо його ще немає)
            if not Pending2FA.objects.filter(user=user, confirmed=False, declined=False).exists():
                print(f"📤 Creating new 2FA request and sending message...")
                # Очищаємо старі записи перед створенням нової
                Pending2FA.objects.filter(user=user).delete()
                print(f"🧹 Cleared old 2FA records for user: {user.username}")
                
                Pending2FA.objects.create(user=user, telegram_id=profile.telegram_id)
                print(f"🎯 Calling send_2fa_request.delay({profile.telegram_id}, {user.username})")
                
                # Перевіримо, що завдання справді вирушає
                try:
                    task_result = send_2fa_request.delay(profile.telegram_id, user.username)
                    print(f"✅ Task queued successfully with ID: {task_result.id}")
                    print(f"📊 Task state: {task_result.state}")
                except Exception as e:
                    print(f"❌ Error queuing task: {str(e)}")
                    # Fallback - викличем задачу синхронно
                    print("🔄 Falling back to synchronous call...")
                    send_2fa_request(profile.telegram_id, user.username)
            else:
                print(f"⏳ 2FA request already pending, not creating new one")
            
            messages.info(request, "Please confirm your login via the Telegram message we've just sent.")
            return render(request, "base.html", {
                "show_2fa_modal": True,
                "username": user.username,
                'telegram_code': None,
                'telegram_notify_enabled': profile.notifications_enabled if (profile and profile.connected and profile.telegram_id) else False,
                'two_factor_enabled': profile.two_factor_enabled if profile else False,
                'telegram_connected': profile.connected and profile.telegram_id is not None if profile else False
            })

        # Якщо 2FA не увімкнена → звичайний логін
        login(request, user)
        track_user_activity(user, "login")  # Трекаем активність входа
        messages.success(request, "Login successful!")
        
        if is_ajax:
            return JsonResponse({"success": True, "message": "Login successful!"})
        return redirect("home")

    return render(request, "base.html", {
        'telegram_code': None,
        'telegram_notify_enabled': False,
        'two_factor_enabled': False,
        'telegram_connected': False
    })


def telegram_2fa_status(request):
    username = request.GET.get("username")
    print(f"🔍 2FA status check for username: {username}")
    
    if not username:
        return JsonResponse({"authenticated": False, "confirmed": False, "status": "error"})

    try:
        user = User.objects.get(username=username)
        
        # Покажемо ВСІ записи для цього користувача
        all_pending = Pending2FA.objects.filter(user=user)
        print(f"🔍 All Pending2FA records for {username}:")
        for p in all_pending:
            print(f"  - ID: {p.id}, confirmed: {p.confirmed}, declined: {p.declined}, created: {p.created_at}")
        
        # Перевіряємо підтверджені запити
        pending_confirmed = Pending2FA.objects.filter(user=user, confirmed=True).first()
        
        # Перевіряємо відхилені запити
        pending_declined = Pending2FA.objects.filter(user=user, declined=True).first()
        
        is_confirmed = bool(pending_confirmed)
        is_declined = bool(pending_declined)
        
        print(f"🔍 Confirmed: {is_confirmed}, Declined: {is_declined}")

        # Якщо підтверджено, авторизуємо користувача і видаляємо запис
        if is_confirmed and pending_confirmed:
            login(request, user)
            request.session.save()
            pending_confirmed.delete()
            print(f"User {username} automatically logged in via 2FA status check")
            
            return JsonResponse({
                "authenticated": True, 
                "confirmed": True,
                "status": "approved"
            })
        
        # Якщо відхилено, повертаємо статус відхилення без видалення
        if is_declined and pending_declined:
            print(f"🚫 2FA request was declined for user: {username}")
            # Не видаляємо запис негайно, дамо фронтенду час на обробку
            return JsonResponse({
                "authenticated": False, 
                "confirmed": False,
                "status": "declined"
            })
        
        # Запит в очікуванні
        print(f"🔍 2FA request still pending for user: {username}")
        return JsonResponse({
            "authenticated": False, 
            "confirmed": False,
            "status": "pending"
        })
        
    except User.DoesNotExist:
        print(f"🔍 User not found: {username}")
        return JsonResponse({
            "authenticated": False, 
            "confirmed": False,
            "status": "error"
        })


@csrf_exempt
def decline_2fa(request):
    """API для відхилення 2FA запиту"""
    print(f"🚫 decline_2fa called with method: {request.method}")
    
    if request.method != 'POST':
        return JsonResponse({"status": "error", "message": "Only POST method allowed"}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        print(f"🚫 Decline request for username: {username}")
        
        if not username:
            return JsonResponse({"status": "error", "message": "Username is required"}, status=400)
        
        user = User.objects.get(username=username)
        print(f"🚫 User found: {user}")

        # Знайти активний запит 2FA і відзначити як відхилений
        pending_request = Pending2FA.objects.filter(
            user=user, 
            confirmed=False, 
            declined=False
        ).first()
        
        print(f"🚫 Active pending request found: {pending_request}")
        
        if pending_request:
            # Зберігаємо дані для оновлення Telegram повідомлення
            telegram_id = pending_request.telegram_id
            message_id = pending_request.telegram_message_id
            
            pending_request.declined = True
            pending_request.save()
            print(f"🚫 Request marked as declined for user: {username}")
            
            # Оновлюємо повідомлення в Telegram, прибираючи кнопки та показуючи закінчення
            from .tasks import update_2fa_message, cleanup_declined_2fa
            try:
                # Оновлюємо повідомлення у Telegram
                update_2fa_message.delay(telegram_id, username, message_id)
                print(f"🚫 Telegram message update task sent")
                
                # Запланувати очищення declined запису через 30 секунд
                cleanup_declined_2fa.apply_async(
                    args=[pending_request.id], 
                    countdown=30
                )
                print(f"🚫 Cleanup task scheduled for 30 seconds")
            except Exception as e:
                print(f"Failed to update Telegram message: {e}")
            
            return JsonResponse({
                "status": "success", 
                "message": "2FA request declined successfully"
            })
        else:
            print(f"🚫 No active 2FA request found for user: {username}")
            return JsonResponse({
                "status": "error", 
                "message": "No active 2FA request found"
            }, status=404)
            
    except User.DoesNotExist:
        print(f"🚫 User not found: {username}")
        return JsonResponse({
            "status": "error", 
            "message": "User not found"
        }, status=404)
    except Exception as e:
        print(f"🚫 Error in decline_2fa: {str(e)}")
        return JsonResponse({
            "status": "error", 
            "message": str(e)
        }, status=500)


@login_required
def logout_view(request):
    logout(request)
    return redirect("home")


@csrf_exempt  
def test_telegram_update(request):
    """API для тестування оновлення повідомлень у Telegram"""
    if not (request.user.is_superuser or settings.DEBUG):
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({"status": "error", "message": "Only POST method allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
        test_type = data.get('test_type', 'update_message')
        
        if test_type == 'update_message':
            # Тестове оновлення повідомлення
            from .tasks import update_2fa_message
            telegram_id = data.get('telegram_id', '123456789')  # тестовый ID
            username = data.get('username', 'test_user')
            message_id = data.get('message_id')
            
            result = update_2fa_message.delay(telegram_id, username, message_id)
            
            return JsonResponse({
                "status": "success",
                "message": "Telegram update task started",
                "task_id": result.id
            })
            
        elif test_type == 'expire_notification':
            # Тестове повідомлення про закінчення
            from .tasks import send_2fa_decline_notification
            telegram_id = data.get('telegram_id', '123456789')
            username = data.get('username', 'test_user')
            
            result = send_2fa_decline_notification.delay(telegram_id, username)
            
            return JsonResponse({
                "status": "success", 
                "message": "Expire notification task started",
                "task_id": result.id
            })
            
        else:
            return JsonResponse({
                "status": "error",
                "message": "Unknown test type"
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)


def latest_notifications(request):
    if not request.user.is_authenticated:
        return JsonResponse({'notifications': []})
    notifications = Notification.objects.filter(user=request.user, read=False).order_by('-created_at')
    data = [{
        'id': n.id,
        'message': n.message,
        'send_telegram': n.send_telegram,
        'send_web': n.send_web,
        'created_at': n.created_at.isoformat()
    } for n in notifications]

    return JsonResponse({'notifications': data})

def unread_notifications_count(request):
    """API для підрахунку непрочитаних повідомлень"""
    if not request.user.is_authenticated:
        return JsonResponse({'count': 0})
    
    count = Notification.objects.filter(user=request.user, read=False).count()
    print(f"📊 Unread notifications for {request.user.username}: {count}")
    return JsonResponse({'count': count})

@csrf_exempt
def bind_telegram(request):
    if request.method == "POST":
        bind_code = request.POST.get("bind_code")
        telegram_id = request.POST.get("telegram_id")
        if not bind_code or not telegram_id:
            try:
                data = json.loads(request.body)
                bind_code = data.get("bind_code")
                telegram_id = data.get("telegram_id")
            except Exception:
                pass
        if not bind_code or not telegram_id:
            return JsonResponse({"status": "error", "msg": "Missing code or telegram_id"})
        try:
            profile = TelegramProfile.objects.get(bind_code=bind_code)
            # Перевірка: якщо вже прив'язаний
            if profile.connected and profile.telegram_id:
                return JsonResponse({"status": "already_linked", "msg": "Account already linked to Telegram."})
            profile.telegram_id = telegram_id
            profile.connected = True
            profile.bind_code = None
            profile.save()
            return JsonResponse({"status": "ok"})
        except TelegramProfile.DoesNotExist:
            return JsonResponse({"status": "error", "msg": "Code not found"})
    return JsonResponse({"status": "error"})


@login_required
@require_POST
def tg_notify_toggle(request):
    profile = getattr(request.user, 'telegram_profile', None)
    # Спрощуємо: перевіряємо тільки чи підключений профіль
    if not profile or not profile.connected:
        return JsonResponse({"status": "error", "msg": "At least connect your Telegram account!"}, status=400)
    try:
        data = json.loads(request.body)
        enabled = data.get("enabled", False)
        profile.notifications_enabled = enabled
        profile.save()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "msg": str(e)}, status=400)
    
def check_telegram(request):
    telegram_id = request.GET.get('telegram_id')
    linked = False
    username = None
    if telegram_id:
        profile = TelegramProfile.objects.filter(telegram_id=telegram_id, connected=True).select_related('user').first()
        if profile:
            linked = True
            username = profile.user.username
    return JsonResponse({'linked': linked, 'username': username})


def check_telegram_status(request):
    """API для перевірки статусу підключення Telegram"""
    if not request.user.is_authenticated:
        return JsonResponse({
            'connected': False,
            'notify_enabled': False,
            'two_factor_enabled': False,
            'bind_code': None
        })
    
    profile = getattr(request.user, 'telegram_profile', None)
    
    # Спрощуємо: перевіряємо тільки чи підключений профіль
    telegram_connected = bool(profile and profile.connected)
    telegram_notify_enabled = profile.notifications_enabled if telegram_connected else False
    two_factor_enabled = profile.two_factor_enabled if telegram_connected else False
    bind_code = profile.bind_code if (profile and not telegram_connected) else None
    
    return JsonResponse({
        'connected': telegram_connected,
        'notify_enabled': telegram_notify_enabled,
        'two_factor_enabled': two_factor_enabled,
        'bind_code': bind_code
    })


@login_required
@require_POST
def tg_2fa_toggle(request):
    profile = getattr(request.user, 'telegram_profile', None)
    # Спрощуємо: перевіряємо тільки чи підключений профіль
    if not profile or not profile.connected:
        return JsonResponse({"status": "error", "msg": "At least connect your Telegram account to enable two-factor authentication!"}, status=400)
    try:
        data = json.loads(request.body)
        enabled = data.get("enabled", False)
        profile.two_factor_enabled = enabled
        profile.save()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "msg": str(e)}, status=400)


@login_required
@require_POST
def use_habit_template(request):
    """API для створення звички користувача з шаблону"""
    try:
        data = json.loads(request.body)
        template_id = data.get('template_id')
        
        if not template_id:
            return JsonResponse({"status": "error", "message": "ID template not specified"}, status=400)
        
        from .models import HabitTemplate, Habit
        
        try:
            template = HabitTemplate.objects.get(id=template_id)
        except HabitTemplate.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Template not found"}, status=404)
        
        # Створюємо нову звичку на основі шаблону
        new_habit = Habit(
            user=request.user,
            name=template.name,
            description=template.description,
            frequency=template.frequency,
            streak_days=0,
            active=True
        )
        new_habit.save()
        
        return JsonResponse({
            "status": "success",
            "habit_id": new_habit.id,
            "message": f"Habit '{template.name}' successfully added"
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
@require_POST
def use_goal_template(request):
    """API для створення мети користувача з шаблону"""
    try:
        data = json.loads(request.body)
        template_id = data.get('template_id')
        
        if not template_id:
            return JsonResponse({"status": "error", "message": "ID template not specified"}, status=400)
        
        from .models import GoalTemplate, Goal, SubGoal, SubGoalTemplate
        
        try:
            template = GoalTemplate.objects.get(id=template_id)
        except GoalTemplate.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Template not found"}, status=404)
        
        # Створюємо нову мету на основі шаблону
        new_goal = Goal(
            user=request.user,
            name=template.name,
            description=template.description,
            completed=False
        )
        new_goal.save()
        
        # Додаємо підцілі з шаблону, якщо вони є
        subgoal_templates = SubGoalTemplate.objects.filter(template=template)
        for subgoal_template in subgoal_templates:
            SubGoal.objects.create(
                goal=new_goal,
                name=subgoal_template.name,
                completed=False
            )
        
        return JsonResponse({
            "status": "success",
            "goal_id": new_goal.id,
            "message": f"Goal '{template.name}' successfully added"
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@login_required
@require_POST
def create_custom_habit(request):
    """API для створення користувацької звички"""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        description = data.get('description', '')
        frequency = data.get('frequency')
        
        if not name or not frequency:
            return JsonResponse({
                "status": "error", 
                "message": "Name and frequency are required"
            }, status=400)
        
        from .models import Habit
        
        # Створюємо нову звичку
        new_habit = Habit(
            user=request.user,
            name=name,
            description=description,
            frequency=frequency,
            streak_days=0,
            active=True
        )
        new_habit.save()
        
        return JsonResponse({
            "status": "ok",
            "habit_id": new_habit.id,
            "message": f"Habit '{name}' successfully created"
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@login_required
@require_POST
def create_custom_goal(request):
    """API для створення користувацької мети"""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        description = data.get('description', '')
        deadline = data.get('deadline')
        subgoals = data.get('subgoals', [])
        
        if not name:
            return JsonResponse({
                "status": "error", 
                "message": "Name is required"
            }, status=400)
        
        from .models import Goal, SubGoal
        
        # Створюємо нову мету
        new_goal = Goal(
            user=request.user,
            name=name,
            description=description,
            deadline=deadline if deadline else None,
            completed=False
        )
        new_goal.save()
        
        # Створюємо підзадачі, якщо вони є
        for subgoal_name in subgoals:
            if subgoal_name.strip():
                SubGoal.objects.create(
                    goal=new_goal,
                    name=subgoal_name.strip(),
                    completed=False
                )
        
        return JsonResponse({
            "status": "ok",
            "goal_id": new_goal.id,
            "message": f"Goal '{name}' successfully created"
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    

@login_required
def get_habit_template(request):
    """API для отримання даних шаблону звички"""
    try:
        template_id = request.GET.get('id')
        
        if not template_id:
            return JsonResponse({"status": "error", "message": "ID template not specified"}, status=400)
        
        from .models import HabitTemplate
        
        try:
            template = HabitTemplate.objects.get(id=template_id)
        except HabitTemplate.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Template not found"}, status=404)
        
        # Формуємо дані шаблону
        template_data = {
            'id': template.id,
            'name': template.name,
            'description': template.description,
            'frequency': template.frequency
        }
        
        return JsonResponse({
            "status": "ok",
            "template": template_data
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


def get_habit_templates(request):
    """API для отримання списку всіх шаблонів звичок"""
    try:
        from .models import HabitTemplate
        
        templates = HabitTemplate.objects.all()
        template_data = [
            {
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'frequency': template.frequency
            } for template in templates
        ]
        
        return JsonResponse({
            "status": "ok",
            "templates": template_data
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_goal_templates(request):
    """API для отримання списку всіх шаблонів цілей"""
    try:
        from .models import GoalTemplate
        
        templates = GoalTemplate.objects.all()
        template_data = [
            {
                'id': template.id,
                'name': template.name,
                'description': template.description
            } for template in templates
        ]
        
        return JsonResponse({
            "status": "ok",
            "templates": template_data
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_goal_template(request):
    """API для отримання даних одного шаблону цілі"""
    try:
        template_id = request.GET.get('id')
        if not template_id:
            return JsonResponse({"status": "error", "message": "ID template not specified"}, status=400)
        from .models import GoalTemplate, SubGoalTemplate
        try:
            template = GoalTemplate.objects.get(id=template_id)
        except GoalTemplate.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Template not found"}, status=404)
        subgoals = SubGoalTemplate.objects.filter(template=template)
        subgoal_data = [{'id': sg.id, 'name': sg.name} for sg in subgoals]
        template_data = {
            'id': template.id,
            'name': template.name,
            'description': template.description,
            'subgoals': subgoal_data
        }
        return JsonResponse({
            "status": "ok",
            "template": template_data
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
@login_required
@require_POST
def toggle_subgoal(request):
    try:
        data = json.loads(request.body)
        subgoal_id = data.get('subgoal_id')
        
        if not subgoal_id:
            return JsonResponse({"status": "error", "message": "Subgoal ID is required"}, status=400)
        
        # Отримуємо підціль та перевіряємо, що вона належить поточному користувачу
        subgoal = get_object_or_404(SubGoal, pk=subgoal_id)
        
        if subgoal.goal.user != request.user:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=403)
        
        # Інвертуємо статус завершення
        subgoal.completed = not subgoal.completed
        subgoal.save()
        
        # Трекаем активність користувача
        if subgoal.completed:
            track_user_activity(request.user, "subgoal_completed")
        
        # Перевіряємо, чи всі підцілі завершені, і якщо так, то відмічаємо всю мету як завершену
        goal = subgoal.goal
        all_completed = all(sg.completed for sg in goal.subgoals.all())
        
        if all_completed and not goal.completed:
            goal.completed = True
            goal.save()
            # Додаткова активність за завершення цілі
            track_user_activity(request.user, "goal_completed", amount=5)
        elif not all_completed and goal.completed:
            goal.completed = False
            goal.save()
        
        return JsonResponse({
            "status": "success", 
            "completed": subgoal.completed, 
            "goal_completed": goal.completed
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
def goal_progress(request, goal_id):
    """API для отримання актуального прогресу цілі"""
    try:
        # Отримуємо ціль та перевіряємо, що вона належить поточному користувачу
        goal = get_object_or_404(Goal, pk=goal_id, user=request.user)
        
        # Отримуємо всі підцілі
        subgoals = goal.subgoals.all()
        total_subgoals = subgoals.count()
        completed_subgoals = subgoals.filter(completed=True).count()
        
        # Рахуєм процент
        progress_percent = round((completed_subgoals / total_subgoals) * 100) if total_subgoals > 0 else 0
        
        return JsonResponse({
            "status": "success",
            "total_subgoals": total_subgoals,
            "completed_subgoals": completed_subgoals,
            "progress_percent": progress_percent,
            "goal_completed": goal.completed
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
def get_activity_chart_data(request):
    """API для отримання даних активності користувача для чарта"""
    try:
        activity_data = get_user_weekly_activity(request.user)
        
        return JsonResponse({
            "status": "success",
            "data": activity_data
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
@require_POST
def delete_goal(request):
    """API для видалення цілі"""
    try:
        data = json.loads(request.body)
        goal_id = data.get('goal_id')
        
        if not goal_id:
            return JsonResponse({"status": "error", "message": "Goal ID is required"}, status=400)
        
        # Отримуємо мету та перевіряємо права доступу
        goal = get_object_or_404(Goal, pk=goal_id, user=request.user)
        goal_name = goal.name
        
        # Видаляємо ціль (підцілі видаляться автоматично через CASCADE)
        goal.delete()
        
        return JsonResponse({
            "status": "success", 
            "message": f"Goal '{goal_name}' has been deleted successfully"
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_POST
def delete_habit(request):
    """API для видалення звички"""
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    try:
        data = json.loads(request.body)
        habit_id = data.get('habit_id')
        
        if not habit_id:
            return JsonResponse({"status": "error", "message": "Habit ID is required"}, status=400)
        
        from .models import Habit
        habit = Habit.objects.get(id=habit_id, user=request.user)
        habit_name = habit.name
        habit.delete()
        
        return JsonResponse({
            "status": "success", 
            "message": f"Habit '{habit_name}' has been deleted successfully"
        })
        
    except Habit.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Habit not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_POST
def toggle_habit_active(request):
    """API для перемикання активності звички"""
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    try:
        data = json.loads(request.body)
        habit_id = data.get('habit_id')
        
        if not habit_id:
            return JsonResponse({"status": "error", "message": "Habit ID is required"}, status=400)
        
        from .models import Habit
        habit = Habit.objects.get(id=habit_id, user=request.user)
        habit.active = not habit.active
        habit.save()
        
        status_text = "activated" if habit.active else "paused"
        return JsonResponse({
            "status": "success", 
            "message": f"Habit '{habit.name}' has been {status_text}",
            "active": habit.active
        })
        
    except Habit.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Habit not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@require_POST
def habit_checkin(request):
    """API для чекіну звички"""
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    try:
        from datetime import date, timedelta
        from .models import Habit, HabitCheckin
        
        data = json.loads(request.body)
        habit_id = data.get('habit_id')
        checkin_date = data.get('date')
        checked = data.get('checked')  # Додаємо підтримку параметра checked
        
        if not habit_id:
            return JsonResponse({"status": "error", "message": "Habit ID is required"}, status=400)
        
        # Парсимо дату
        if checkin_date:
            from datetime import datetime
            checkin_date = datetime.strptime(checkin_date, '%Y-%m-%d').date()
        else:
            checkin_date = date.today()
        
        habit = Habit.objects.get(id=habit_id, user=request.user)
        
        # Шукаємо існуючий чекін
        checkin = HabitCheckin.objects.filter(
            habit=habit,
            date=checkin_date
        ).first()
        
        # Визначаємо бажаний стан
        if checked is not None:
            target_completed = checked
        else:
            # Якщо не передано параметр checked, перемикаємо
            target_completed = not (checkin.completed if checkin else False)
        
        if target_completed:
            # Потрібно відзначити як виконано
            if not checkin:
                # Створюємо новий чекін
                checkin = HabitCheckin.objects.create(
                    habit=habit,
                    date=checkin_date,
                    completed=True
                )
            else:
                # Оновлюємо існуючий
                checkin.completed = True
                checkin.save()
        else:
            # Потрібно зняти позначку
            if checkin:
                # Якщо чекін існує, оновлюємо
                checkin.completed = False
                checkin.save()
            else:
                # Якщо немає чекіна, створюємо з completed=False для консистентності
                checkin = HabitCheckin.objects.create(
                    habit=habit,
                    date=checkin_date,
                    completed=False
                )
        
        # Отримуємо фінальний стан чекіна
        final_completed = checkin.completed if checkin else False
        
        # Оновлюємо streak_days та last_checkin
        if final_completed:
            # Перевіряємо чи це послідовний день
            if habit.last_checkin:
                days_diff = (checkin_date - habit.last_checkin).days
                if days_diff == 1:
                    habit.streak_days += 1
                elif days_diff > 1:
                    habit.streak_days = 1
            else:
                habit.streak_days = 1
            
            habit.last_checkin = checkin_date
            
            # Оновлюємо максимальний streak
            if habit.streak_days > habit.max_streak_days:
                habit.max_streak_days = habit.streak_days
        else:
            # Якщо скасували чекін, перерахуємо streak
            if habit.last_checkin == checkin_date:
                # Знаходимо попередній completed чекін
                prev_checkin = HabitCheckin.objects.filter(
                    habit=habit,
                    date__lt=checkin_date,
                    completed=True
                ).order_by('-date').first()
                
                if prev_checkin:
                    habit.last_checkin = prev_checkin.date
                    # Перерахуємо streak
                    consecutive_days = 1
                    check_date = prev_checkin.date - timedelta(days=1)
                    while True:
                        prev_day_checkin = HabitCheckin.objects.filter(
                            habit=habit,
                            date=check_date,
                            completed=True
                        ).first()
                        
                        if prev_day_checkin:
                            consecutive_days += 1
                            check_date -= timedelta(days=1)
                        else:
                            break
                    
                    habit.streak_days = consecutive_days
                else:
                    habit.last_checkin = None
                    habit.streak_days = 0
        
        habit.save()
        
        # ОЧИЩЕННЯ КЕШУ: Очищаємо кеш історії звичок при зміні
        cache_key = f'habits_history_{request.user.id}'
        cache.delete(cache_key)
        
       # Розраховуємо статистику звички
        from datetime import datetime, timedelta
        total_days = (datetime.now().date() - habit.created_at.date()).days + 1
        completed_checkins = HabitCheckin.objects.filter(habit=habit, completed=True).count()
        completion_rate = round((completed_checkins / total_days) * 100) if total_days > 0 else 0
        
        # Знаходимо найдовший streak
        longest_streak = 0
        current_streak = 0
        check_date = habit.created_at.date()
        end_date = datetime.now().date()
        
        while check_date <= end_date:
            checkin = HabitCheckin.objects.filter(habit=habit, date=check_date, completed=True).first()
            if checkin:
                current_streak += 1
                longest_streak = max(longest_streak, current_streak)
            else:
                current_streak = 0
            check_date += timedelta(days=1)
        
        stats = {
            'current_streak': habit.streak_days,
            'longest_streak': longest_streak,
            'completion_rate': completion_rate
        }
        
        message = f"Habit '{habit.name}' marked as {'completed' if final_completed else 'not completed'} for {checkin_date}"
        
        return JsonResponse({
            "status": "success",
            "message": message,
            "completed": final_completed,
            "streak_days": habit.streak_days,
            "stats": stats
        })
        
    except Habit.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Habit not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
def daily_habits_status(request):
    """API для перевірки статусу всіх звичок за сьогоднішній день"""
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    
    try:
        from datetime import date
        from .models import Habit, HabitCheckin
        
        today = date.today()
        
        # Отримуємо всі активні звички користувача
        user_habits = Habit.objects.filter(user=request.user, active=True)
        total_habits = user_habits.count()
        
        if total_habits == 0:
            return JsonResponse({
                "status": "success",
                "all_completed": False,
                "total_habits": 0,
                "completed_habits": 0,
                "message": "Немає активних звичок"
            })
        
        # Перевіряємо, скільки звичок виконано сьогодні
        completed_habits = 0
        for habit in user_habits:
            if habit.is_checked_today():
                completed_habits += 1
        
        all_completed = completed_habits == total_habits
        
        return JsonResponse({
            "status": "success",
            "all_completed": all_completed,
            "total_habits": total_habits,
            "completed_habits": completed_habits,
            "completion_percentage": round((completed_habits / total_habits) * 100, 1) if total_habits > 0 else 0,
            "date": today.isoformat(),
            "message": f"Виконано {completed_habits} з {total_habits} звичок" + (" - всі завершені! 🎉" if all_completed else "")
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


def send_support_message(request):
    """API для надсилання повідомлення на технічну підтримку (працює для всіх користувачів)"""
    if request.method != 'POST':
        return JsonResponse({"status": "error", "message": "Only POST method allowed"}, status=405)
    
    try:
        from .models import SupportMessage
        
        # Отримуємо дані із запиту
        data = json.loads(request.body)
        category = data.get('category', '').strip()
        message = data.get('message', '').strip()
        
        # Додаткові поля в залежності від категорії
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        device_info = data.get('device_info', '').strip()
        error_message = data.get('error_message', '').strip()
        last_login = data.get('last_login', '').strip()
        
        # Basic validation
        if not category:
            return JsonResponse({"status": "error", "message": "Problem category is required"}, status=400)
        
        if not message:
            return JsonResponse({"status": "error", "message": "Problem description is required"}, status=400)
        
        # Category-specific validation
        if category == '2fa_problem':
            if not username:
                return JsonResponse({"status": "error", "message": "Username is required for 2FA problems"}, status=400)
        
        elif category == 'login_problem':
            if not username and not email:
                return JsonResponse({"status": "error", "message": "Username or email is required for login problems"}, status=400)
        
        elif category == 'telegram_problem':
            if not username:
                return JsonResponse({"status": "error", "message": "Username is required for Telegram problems"}, status=400)
        
        # Для неавторизованих користувачів потрібна певна форма ідентифікації
        # Для проблем із 2FA та Telegram достатньо імені користувача
        # Для інших проблем нам потрібна електронна адреса для зв'язку
        if not request.user.is_authenticated:
            if category in ['2fa_problem', 'telegram_problem']:
                # Username is sufficient for these categories
                if not username:
                    return JsonResponse({"status": "error", "message": f"Username is required for {category.replace('_', ' ')} when not logged in"}, status=400)
            else:
                # For other categories, we need email to contact the user
                if not email:
                    return JsonResponse({"status": "error", "message": "Email is required for unauthenticated users for this type of problem"}, status=400)
        
        if len(message) > 2000:
            return JsonResponse({"status": "error", "message": "Message too long (maximum 2000 characters)"}, status=400)
        
        # Отримуємо додаткову інформацію про запит
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = request.META.get('REMOTE_ADDR', '')
        
        # Якщо проксі, отримуємо реальний IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        
        # Формуємо structured_data з додатковими полями
        structured_data = {
            'category': category,
            'username': username,
            'email': email,
            'phone': phone,
            'device_info': device_info,
            'error_message': error_message,
            'last_login': last_login,
        }
        
        # Визначаємо пріоритет залежно від категорії
        priority_mapping = {
            '2fa_problem': 'high',
            'login_problem': 'medium',
            'telegram_problem': 'low',
            'technical_issue': 'low',
            'feature_request': 'low'
        }
        
        # Створюємо повідомлення на підтримку
        support_message = SupportMessage.objects.create(
            user=request.user if request.user.is_authenticated else None,
            subject=f"{category}: {message[:50]}...",
            message=message,
            problem_type=category,
            user_agent=user_agent,
            ip_address=ip_address,
            priority=priority_mapping.get(category, 'low'),
           # Додаємо структуровані дані до admin_notes для перегляду
            admin_notes=f"Structured data: {json.dumps(structured_data, ensure_ascii=False, indent=2)}"
        )
        
        return JsonResponse({
            "status": "success",
            "message": "Your message has been sent to technical support. We will contact you shortly.",
            "ticket_id": support_message.id
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid data format"}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending support message: {str(e)}")
        return JsonResponse({"status": "error", "message": "An error occurred while sending the message"}, status=500)

@login_required
def habits_completion_history(request):
    """
   API для отримання історії виконання звичок по днях (ОПТИМІЗОВАНО + КЕШУВАННЯ)
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count, Q
        
        # Перевіряємо кеш для цього користувача
        cache_key = f'habits_history_{request.user.id}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return JsonResponse({
                "status": "success",
                "data": cached_data
            })
        
        # Отримуємо звички користувача
        user_habits = Habit.objects.filter(user=request.user, active=True)
        
        if not user_habits.exists():
            return JsonResponse({
                "status": "success",
                "data": {}
            })
        
        # Отримуємо дані за останні 30 днів
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        # ОПТИМІЗАЦІЯ: Отримуємо всі check-ins за період одним запитом
        habit_ids = list(user_habits.values_list('id', flat=True))
        checkins = HabitCheckin.objects.filter(
            habit_id__in=habit_ids,
            date__range=[start_date, end_date],
            completed=True
        ).values('date', 'habit_id')
        
        # Групуємо checkins щодня для швидкого доступу
        checkins_by_date = {}
        for checkin in checkins:
            date_str = checkin['date'].strftime('%Y-%m-%d')
            if date_str not in checkins_by_date:
                checkins_by_date[date_str] = set()
            checkins_by_date[date_str].add(checkin['habit_id'])
        
        total_habits = user_habits.count()
        completion_data = {}
        
        # ОПТИМІЗАЦІЯ: Обробляємо всі дні за один прохід
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            
            # Для сьогоднішнього дня використовуємо актуальний стан
            if current_date == end_date:
                completed_habits = sum(1 for habit in user_habits if habit.is_checked_today())
            else:
                # Для минулих днів використовуємо завантажені дані
                completed_habits = len(checkins_by_date.get(date_str, set()))
            
            all_completed = (completed_habits == total_habits and total_habits > 0)
            
            completion_data[date_str] = {
                'all_completed': all_completed,
                'completed_count': completed_habits,
                'total_count': total_habits
            }
            
            current_date += timedelta(days=1)
        
       # Кешуємо результат на 5 хвилин (для минулих днів дані рідко змінюються)
        cache.set(cache_key, completion_data, 300)
        
        return JsonResponse({
            "status": "success",
            "data": completion_data
        })
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting habits completion history: {str(e)}")
        return JsonResponse({"status": "error", "message": "Failed to load habits history"}, status=500)

@login_required
@require_POST
def save_habits_completion(request):
    """
    API для збереження інформації про виконання всіх звичок у конкретний день
    """
    try:
        data = json.loads(request.body)
        date_str = data.get('date')
        all_completed = data.get('all_completed', False)
        
        if not date_str:
            return JsonResponse({"status": "error", "message": "Date is required"}, status=400)
        
        # Можна зберегти цю інформацію до бази даних для статистики 
        # Поки що просто повертаємо успіх
        
        return JsonResponse({
            "status": "success",
            "message": "Habits completion status saved"
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON data"}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving habits completion: {str(e)}")
        return JsonResponse({"status": "error", "message": "Failed to save habits completion"}, status=500)


@auth_required_with_modal
def statistics_page(request):
    """Сторінка статистики користувача з графіками та анімаціями"""
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Count, Avg, Q
    
    # Отримуємо цілі користувача
    user_goals = Goal.objects.filter(user=request.user)
    total_goals = user_goals.count()
    completed_goals = user_goals.filter(completed=True).count()
    active_goals = user_goals.filter(completed=False).count()
    
    active_goals_list = user_goals.filter(completed=False).prefetch_related('subgoals')
    total_progress = 0
    goal_count_for_progress = 0
    
    # Додаємо активні цілі
    if active_goals_list.exists():
        for goal in active_goals_list:
            total_progress += goal.get_progress_percent()
            goal_count_for_progress += 1
    
    # Додаємо завершені цілі як 100%
    if completed_goals > 0:
        total_progress += (completed_goals * 100)
        goal_count_for_progress += completed_goals
    
    # Обчислюємо середній прогрес по цілях
    if goal_count_for_progress > 0:
        average_goal_progress = round(total_progress / goal_count_for_progress, 1)
    else:
        average_goal_progress = 0
    
    # Отримуємо звички користувача
    user_habits = Habit.objects.filter(user=request.user)
    total_habits = user_habits.count()
    active_habits = user_habits.filter(active=True).count()
    
    # Статистика звичок
    today = timezone.now().date()
    completed_today = sum(1 for habit in user_habits.filter(active=True) if habit.is_checked_today())
    
    # Відсоток виконання звичок на сьогодні (для кругової діаграми)
    if active_habits > 0:
        today_completion_percent = round((completed_today / active_habits) * 100, 1)
    else:
        today_completion_percent = 0
    
    # Середній відсоток виконання звичок за весь час
    if active_habits > 0:
        avg_habit_completion = round(
            sum(habit.completion_rate for habit in user_habits.filter(active=True)) / active_habits,
            1
        )
    else:
        avg_habit_completion = 0
    
    # Поточний та максимальний streak
    current_max_streak = 0
    longest_streak_ever = 0
    for habit in user_habits.filter(active=True):
        current_max_streak = max(current_max_streak, habit.current_streak)
        longest_streak_ever = max(longest_streak_ever, habit.longest_streak)
    
    # Активність протягом останніх 7 днів
    week_ago = today - timedelta(days=7)
    recent_checkins = HabitCheckin.objects.filter(
        habit__user=request.user,
        date__gte=week_ago,
        completed=True
    ).count()
    
    # Активність користувача
    activity_data_raw = get_user_weekly_activity(request.user)
    total_activity_points = activity_data_raw.get('total_activities', 0)
    
    # Підготовка даних для графіків 
    # Графік виконання навичок за останні 30 днів
    habits_chart_data = []
    for i in range(30):
        check_date = today - timedelta(days=29-i)
        completed = HabitCheckin.objects.filter(
            habit__user=request.user,
            date=check_date,
            completed=True
        ).count()
        habits_chart_data.append({
            'date': check_date.strftime('%d.%m'),
            'completed': completed
        })
    
    # Графік прогресу цілей (топ-5 активних)
    goals_chart_data = []
    for goal in active_goals_list[:5]:
        goals_chart_data.append({
            'id': goal.id,
            'name': goal.name[:20] + ('...' if len(goal.name) > 20 else ''),
            'progress': goal.get_progress_percent()
        })
    
    # Підготовка даних активності для графіка
    activity_chart_data = []
    if 'weekly_data' in activity_data_raw and 'labels' in activity_data_raw:
        for day_label, count in zip(activity_data_raw['labels'], activity_data_raw['weekly_data']):
            activity_chart_data.append({
                'day': day_label,
                'count': count
            })
    
    context = {
        # Загальна статистика
        'total_goals': total_goals,
        'completed_goals': completed_goals,
        'active_goals': active_goals,
        'average_goal_progress': average_goal_progress,
        
        'total_habits': total_habits,
        'active_habits': active_habits,
        'completed_today': completed_today,
        'today_completion_percent': today_completion_percent,
        'avg_habit_completion': avg_habit_completion,
        'current_max_streak': current_max_streak,
        'longest_streak_ever': longest_streak_ever,
        
        'recent_checkins': recent_checkins,
        'total_activity_points': total_activity_points,
        
        # Данные для графиков (будем передавать как JSON)
        'habits_chart_data': json.dumps(habits_chart_data),
        'goals_chart_data': json.dumps(goals_chart_data),
        'activity_chart_data': json.dumps(activity_chart_data),
    }
    
    return render(request, 'pages/statistics.html', context)

@login_required
def test_websocket_notification(request):
    """Надсилає тестове повідомлення поточному користувачеві через WebSocket"""
    from datetime import datetime
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    
    user = request.user
    
    # Створюємо повідомлення у БД
    notification = Notification.objects.create(
        user=user,
        message=f"🧪 Test WebSocket at {datetime.now().strftime('%H:%M:%S')}",
        notification_type='general',
        web_sent=True,
        telegram_sent=False
    )
    
    # Відправляємо через WebSocket
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f'user_{user.id}',
                {
                    'type': 'notification_message',
                    'message': notification.message,
                    'notification_id': notification.id,
                    'created_at': notification.created_at.isoformat(),
                    'notification_type': notification.notification_type
                }
            )
            return JsonResponse({
                'status': 'success',
                'message': 'Sent via WebSocket',
                'notification_id': notification.id
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    else:
        return JsonResponse({'status': 'error', 'message': 'No channel layer'}, status=500)


@login_required
def mark_notification_read(request):
    """Позначає повідомлення як прочитане"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        notification_id = data.get('notification_id')
        
        if not notification_id:
            return JsonResponse({'status': 'error', 'message': 'Missing notification_id'}, status=400)
        
        print(f"📝 Marking notification {notification_id} as read for user {request.user.username}")
        
        # Позначаємо як прочитанеё
        updated = Notification.objects.filter(
            id=notification_id,
            user=request.user
        ).update(read=True)
        
        if updated:
            print(f"✅ Notification {notification_id} marked as read")
            return JsonResponse({'status': 'success', 'message': 'Marked as read'})
        else:
            print(f"⚠️ Notification {notification_id} not found or not owned by user")
            return JsonResponse({'status': 'error', 'message': 'Notification not found'}, status=404)
    
    except Exception as e:
        print(f"❌ Error marking notification as read: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)