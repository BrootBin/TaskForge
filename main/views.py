from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.conf import settings
from .models import Notification, TelegramProfile, Pending2FA, SubGoal, Goal
from .tasks import send_2fa_request
from .activity_tracker import track_user_activity, get_user_weekly_activity
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
import random
import json
import os

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
            # Если аккаунт подключен, не показываем bind_code
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


@login_required
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

@login_required
def habits_page(request):
    """Сторінка управління привычками користувача"""
    from .models import Habit, HabitTemplate
    from django.utils import timezone
    from datetime import datetime, timedelta
    
    # Получаемо всі привычки користувача
    user_habits = Habit.objects.filter(user=request.user).order_by('-created_at')

    # Получаем шаблоны привычек для створення нових
    habit_templates = HabitTemplate.objects.all()

    # Статистика привычек
    total_habits = user_habits.count()
    active_habits = user_habits.filter(active=True).count()
    
    # Привычки, отмеченные сегодня
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

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm")

        # Проверяем, если это AJAX запрос
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

        # Проверяем, если это AJAX запрос
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
                # Очищаем старые записи перед созданием новой
                Pending2FA.objects.filter(user=user).delete()
                print(f"🧹 Cleared old 2FA records for user: {user.username}")
                
                Pending2FA.objects.create(user=user, telegram_id=profile.telegram_id)
                print(f"🎯 Calling send_2fa_request.delay({profile.telegram_id}, {user.username})")
                
                # Проверим, что задача действительно отправляется
                try:
                    task_result = send_2fa_request.delay(profile.telegram_id, user.username)
                    print(f"✅ Task queued successfully with ID: {task_result.id}")
                    print(f"📊 Task state: {task_result.state}")
                except Exception as e:
                    print(f"❌ Error queuing task: {str(e)}")
                    # Fallback - вызовем задачу синхронно
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
        track_user_activity(user, "login")  # Трекаем активность входа
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
        
        # Покажем ВСЕ записи для этого пользователя
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
            # Не удаляем запись немедленно, дадим фронтенду время на обработку
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
            # Сохраняем данные для обновления Telegram сообщения
            telegram_id = pending_request.telegram_id
            message_id = pending_request.telegram_message_id
            
            pending_request.declined = True
            pending_request.save()
            print(f"🚫 Request marked as declined for user: {username}")
            
            # Обновляем сообщение в Telegram, убирая кнопки и показывая истечение
            from .tasks import update_2fa_message, cleanup_declined_2fa
            try:
                # Обновляем сообщение в Telegram
                update_2fa_message.delay(telegram_id, username, message_id)
                print(f"🚫 Telegram message update task sent")
                
                # Запланировать очистку declined записи через 30 секунд
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
    """API для тестирования обновления сообщений в Telegram"""
    if not (request.user.is_superuser or settings.DEBUG):
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({"status": "error", "message": "Only POST method allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
        test_type = data.get('test_type', 'update_message')
        
        if test_type == 'update_message':
            # Тестовое обновление сообщения
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
            # Тестовое уведомление об истечении
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


@login_required
def notifications_api(request):
    notifications = Notification.objects.filter(user=request.user, read=False)
    data = [
        {"id": n.id, "message": n.message, "created_at": n.created_at.isoformat()}
        for n in notifications
    ]
    return JsonResponse({"notifications": data})

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

@login_required
@login_required
def generate_telegram_code(request):
    profile, _ = TelegramProfile.objects.get_or_create(user=request.user)
    
    # Перевіряємо, чи вже підключений акаунт Telegram
    if profile.connected and profile.telegram_id:
        return JsonResponse({
            "status": "already_connected",
            "message": "Your Telegram account is already linked."
        })
    
    profile.bind_code = f"{random.randint(100000, 999999)}"
    profile.save()
    return JsonResponse({"code": profile.bind_code, "status": "ok"})

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
                return JsonResponse({"status": "error", "msg": "Invalid data"})
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


@login_required
def check_telegram_status(request):
    """API для перевірки статусу підключення Telegram"""
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
            "status": "ok",
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
            "status": "ok",
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
        
        # Вычисляем процент
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
    """API для удаления цели"""
    try:
        data = json.loads(request.body)
        goal_id = data.get('goal_id')
        
        if not goal_id:
            return JsonResponse({"status": "error", "message": "Goal ID is required"}, status=400)
        
        # Получаем цель и проверяем права доступа
        goal = get_object_or_404(Goal, pk=goal_id, user=request.user)
        goal_name = goal.name
        
        # Удаляем цель (подцели удалятся автоматически через CASCADE)
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
        import json
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
        import json
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


@require_POST
def habit_checkin(request):
    """API для чекіну звички"""
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    try:
        import json
        from datetime import date, timedelta
        from .models import Habit, HabitCheckin
        
        data = json.loads(request.body)
        habit_id = data.get('habit_id')
        checkin_date = data.get('date')
        
        if not habit_id:
            return JsonResponse({"status": "error", "message": "Habit ID is required"}, status=400)
        
        # Парсимо дату
        if checkin_date:
            from datetime import datetime
            checkin_date = datetime.strptime(checkin_date, '%Y-%m-%d').date()
        else:
            checkin_date = date.today()
        
        habit = Habit.objects.get(id=habit_id, user=request.user)
        
        # Перевіряємо, чи існує чекін на цю дату
        checkin, created = HabitCheckin.objects.get_or_create(
            habit=habit,
            date=checkin_date,
            defaults={'completed': True}
        )
        
        if not created:
            # Якщо чекін вже існує, перемикаємо статус
            checkin.completed = not checkin.completed
            checkin.save()
        
        # Оновлюємо streak_days та last_checkin
        if checkin.completed:
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
        
        message = f"Habit '{habit.name}' marked as {'completed' if checkin.completed else 'not completed'} for {checkin_date}"
        
        return JsonResponse({
            "status": "success",
            "message": message,
            "completed": checkin.completed,
            "streak_days": habit.streak_days
        })
        
    except Habit.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Habit not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)