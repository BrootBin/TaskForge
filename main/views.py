from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from .models import Notification, TelegramProfile
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import random

def home(request):
    return render(request, 'pages/index.html')

def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm")

        if password != confirm:
            messages.error(request, "Паролі не співпадають")
            return redirect("home")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Користувач вже існує")
            return redirect("home")

        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        return redirect("home")
    return redirect("home")


def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect("home")
        else:
            messages.error(request, "Невірний логін або пароль")
            return redirect("home")
    return redirect("home")

@login_required
def logout_view(request):
    logout(request)
    return redirect("home")


@login_required
def notifications_api(request):
    # Повертаємо лише непрочитані повідомлення для користувача
    notifications = Notification.objects.filter(user=request.user, read=False)
    data = [
        {"id": n.id, "message": n.message, "created_at": n.created_at.isoformat()}
        for n in notifications
    ]
    return JsonResponse({"notifications": data})

def latest_notifications(request):
    if not request.user.is_authenticated:
        return JsonResponse({'notifications': []})

    # Отримуємо непрочитані
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
        try:
            profile = TelegramProfile.objects.get(bind_code=bind_code)
            profile.telegram_id = telegram_id
            profile.connected = True
            profile.bind_code = None
            profile.save()
            return JsonResponse({"status": "ok"})
        except TelegramProfile.DoesNotExist:
            return JsonResponse({"status": "error"})
    return JsonResponse({"status": "error"})