from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
	path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
	path('api/notifications/latest/', views.latest_notifications, name='latest_notifications'),
	path('bind_telegram/', views.bind_telegram, name='bind_telegram'),
]
