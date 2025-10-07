from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from .models import Notification, TelegramProfile, Pending2FA
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import random
import json
import os

def home(request):
    telegram_code = None
    telegram_notify_enabled = False
    two_factor_enabled = False
    if request.user.is_authenticated:
        profile = getattr(request.user, 'telegram_profile', None)
        if profile:
            telegram_code = profile.bind_code
            telegram_notify_enabled = profile.connected
            two_factor_enabled = profile.two_factor_enabled
    return render(request, 'pages/index.html', {
        'telegram_code': telegram_code,
        'telegram_notify_enabled': telegram_notify_enabled,
        'two_factor_enabled': two_factor_enabled
    })

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm")

        if password != confirm:
            messages.error(request, "Паролі не співпадають")
            return redirect("home")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Користувач з таким іменем вже існує")
            return redirect("home")


    user = User.objects.create_user(username=username, password=password)
    bind_code = f"{random.randint(100000, 999999)}"
    TelegramProfile.objects.create(user=user, bind_code=bind_code)
    login(request, user)
    return redirect("home")



def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            profile = getattr(user, 'telegram_profile', None)
            if profile and profile.two_factor_enabled:
                from .models import Pending2FA
                pending = Pending2FA.objects.filter(user=user, telegram_id=profile.telegram_id).first()
                if pending and pending.confirmed:
                    login(request, user)
                    pending.delete()
                    return redirect("home")
                else:
                    if not pending:
                        Pending2FA.objects.create(user=user, telegram_id=profile.telegram_id)
                        # Вызываем Python-бота через Celery
                        from main.tasks import send_2fa_request
                        send_2fa_request.delay(profile.telegram_id, user.username)
                    messages.info(request, "Підтвердіть вхід через Telegram!")
                    return redirect("home")
            else:
                login(request, user)
                return redirect("home")
        else:
            messages.error(request, "Невірний логін або пароль")
            return redirect("home")
    return redirect("home")


@csrf_exempt
def telegram_2fa_confirm(request):
    if request.method == "POST":
        data = json.loads(request.body)
        telegram_id = data.get('telegram_id')
        username = data.get('username')
        try:
            user = User.objects.get(username=username)
            pending = Pending2FA.objects.filter(user=user, telegram_id=telegram_id, confirmed=False).first()
            if pending:
                pending.confirmed = True
                pending.save()
                return JsonResponse({"status": "ok"})
            return JsonResponse({"status": "error", "msg": "No pending session"})
        except User.DoesNotExist:
            return JsonResponse({"status": "error", "msg": "User not found"})
    return JsonResponse({"status": "error"})

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
    profile.bind_code = f"{random.randint(100000, 999999)}"
    profile.save()
    return JsonResponse({"code": profile.bind_code})


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
            # Проверка: если уже привязан
            if profile.connected and profile.telegram_id:
                return JsonResponse({"status": "already_linked", "msg": "Аккаунт уже привязан к Telegram."})
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
    if not profile or not profile.connected or not profile.telegram_id:
        return JsonResponse({"status": "error", "msg": "Спочатку привʼяжіть Telegram-акаунт!"}, status=400)
    try:
        data = json.loads(request.body)
        enabled = data.get("enabled", False)
        profile.connected = enabled
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
@require_POST
def tg_2fa_toggle(request):
    profile = getattr(request.user, 'telegram_profile', None)
    if not profile or not profile.connected or not profile.telegram_id:
        return JsonResponse({"status": "error", "msg": "Спочатку привʼяжіть Telegram-акаунт, щоб включити двохфакторну аутентифікацію!"}, status=400)
    try:
        data = json.loads(request.body)
        enabled = data.get("enabled", False)
        profile.two_factor_enabled = enabled
        profile.save()
        return JsonResponse({"status": "ok"})
    except Exception as e:
        return JsonResponse({"status": "error", "msg": str(e)}, status=400)