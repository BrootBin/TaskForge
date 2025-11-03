from django.urls import path
from . import views

urlpatterns = [
	# Основні сторінки
   path('', views.home, name='home'),
   path('goals/', views.goals_page, name='goals'),
   path('habits/', views.habits_page, name='habits'),
	path("register/", views.register_view, name="register"),
   path("login/", views.login_view, name="login"),
   path("logout/", views.logout_view, name="logout"),


	# API для сповіщень та Telegram
	path('api/notifications/latest/', views.latest_notifications, name='latest_notifications'),
	path('bind_telegram/', views.bind_telegram, name='bind_telegram'),

	# API для управління Telegram
	path('api/tg_notify_toggle/', views.tg_notify_toggle, name='tg_notify_toggle'),
   path('api/check_telegram/', views.check_telegram, name='check_telegram'),
   path('api/check_telegram_status/', views.check_telegram_status, name='check_telegram_status'),
	path('api/tg_2fa_toggle/', views.tg_2fa_toggle, name='tg_2fa_toggle'),
	path("api/telegram_2fa_status/", views.telegram_2fa_status, name="telegram_2fa_status"),
	path("api/check_2fa_status/", views.telegram_2fa_status, name="check_2fa_status"),
	path("api/decline_2fa/", views.decline_2fa, name="decline_2fa"),
	path("api/test_telegram_update/", views.test_telegram_update, name="test_telegram_update"),

	# API для шаблонів цілей та звичок
   path('api/use-habit-template/', views.use_habit_template, name='use_habit_template'),
   path('api/use-goal-template/', views.use_goal_template, name='use_goal_template'),
   path('api/create-custom-habit/', views.create_custom_habit, name='create_custom_habit'),
   path('api/create-custom-goal/', views.create_custom_goal, name='create_custom_goal'),
   
   # API для отримання даних шаблонів звичок
   path('api/get-habit-template/', views.get_habit_template, name='get_habit_template'),
   path('api/get-habit-templates/', views.get_habit_templates, name='get_habit_templates'),

	# API для отримання даних шаблонів цілей
   path('api/get-goal-templates/', views.get_goal_templates, name='get_goal_templates'),
	path('api/get-goal-template/', views.get_goal_template, name='get_goal_template'),
   
   # API для керування цілями та звичками
   path('api/toggle-subgoal/', views.toggle_subgoal, name='toggle_subgoal'),
   path('api/goal-progress/<int:goal_id>/', views.goal_progress, name='goal_progress'),
   path('api/delete-goal/', views.delete_goal, name='delete_goal'),
   path('api/delete-habit/', views.delete_habit, name='delete_habit'),
   path('api/toggle-habit-active/', views.toggle_habit_active, name='toggle_habit_active'),
   path('api/habit-checkin/', views.habit_checkin, name='habit_checkin'),
   path('api/daily-habits-status/', views.daily_habits_status, name='daily_habits_status'),
	
   # API для отримання даних активності користувача
   path('api/activity-chart/', views.get_activity_chart_data, name='get_activity_chart_data'),
   
   # API для роботи з календарем звичок
   path('api/habits-completion-history/', views.habits_completion_history, name='habits_completion_history'),
   path('api/habits-completion/', views.save_habits_completion, name='save_habits_completion'),
   
   # API для технической поддержки
   path('api/support/send-message/', views.send_support_message, name='send_support_message'),
]
