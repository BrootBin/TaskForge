from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
	path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
	path('api/notifications/latest/', views.latest_notifications, name='latest_notifications'),
	path('bind_telegram/', views.bind_telegram, name='bind_telegram'),
	path('api/tg_notify_toggle/', views.tg_notify_toggle, name='tg_notify_toggle'),
    path('api/check_telegram/', views.check_telegram, name='check_telegram'),
	path('api/tg_2fa_toggle/', views.tg_2fa_toggle, name='tg_2fa_toggle'),
    path('api/telegram_2fa/', views.telegram_2fa_confirm, name='telegram_2fa_confirm'),
]
