from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from .models import Notification, TelegramProfile, Pending2FA, SubGoal, Goal
from .tasks import send_2fa_request
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
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
            telegram_code = profile.bind_code
            # Виправляємо: використовуємо правильне поле для сповіщень
            telegram_notify_enabled = profile.notifications_enabled if (profile.connected and profile.telegram_id) else False
            two_factor_enabled = profile.two_factor_enabled
            telegram_connected = profile.connected and profile.telegram_id is not None
        
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
        'template_habits': template_habits
    })

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm")

        if password != confirm:
            messages.error(request, "The passwords do not match")
            return redirect("home")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return redirect("home")


    user = User.objects.create_user(username=username, password=password)
    bind_code = f"{random.randint(100000, 999999)}"
    TelegramProfile.objects.create(user=user, bind_code=bind_code)
    login(request, user)
    return redirect("home")

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)

        if user is None:
            messages.error(request, "Incorrect username or password.")
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
            if not Pending2FA.objects.filter(user=user, confirmed=False).exists():
                print(f"📤 Creating new 2FA request and sending message...")
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
        messages.success(request, "Login successful!")
        return redirect("home")

    return render(request, "base.html", {
        'telegram_code': None,
        'telegram_notify_enabled': False,
        'two_factor_enabled': False,
        'telegram_connected': False
    })


def telegram_2fa_status(request):
    username = request.GET.get("username")
    if not username:
        return JsonResponse({"authenticated": False, "confirmed": False, "status": "error"})

    try:
        user = User.objects.get(username=username)
        pending = Pending2FA.objects.filter(user=user, confirmed=True).first()
        is_confirmed = bool(pending)
        
        # Якщо підтверджено, авторизуємо користувача та видаляємо запис
        if is_confirmed and pending:
            login(request, user)
            request.session.save()
            pending.delete()
            print(f"User {username} automatically logged in via 2FA status check")
        
        return JsonResponse({
            "authenticated": is_confirmed, 
            "confirmed": is_confirmed,
            "status": "approved" if is_confirmed else "pending"
        })
    except User.DoesNotExist:
        return JsonResponse({
            "authenticated": False, 
            "confirmed": False,
            "status": "error"
        })

@login_required
def logout_view(request):
    logout(request)
    return redirect("home")


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
def bind_telegram(request):
    if request.method == "POST":
        telegram_id = request.POST.get("telegram_id")
        profile, created = TelegramProfile.objects.get_or_create(user=request.user)
        profile.telegram_id = telegram_id
        profile.connected = True
        profile.save()
        return JsonResponse({"status": "ok"})
    return JsonResponse({"status": "error"}, status=400)


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
        return JsonResponse({"status": "ok"})
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
        return JsonResponse({"status": "ok"})
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
        
        # Перевіряємо, чи всі підцілі завершені, і якщо так, то відмічаємо всю мету як завершену
        goal = subgoal.goal
        all_completed = all(sg.completed for sg in goal.subgoals.all())
        
        if all_completed and not goal.completed:
            goal.completed = True
            goal.save()
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