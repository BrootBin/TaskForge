from django.contrib import admin
from .models import Habit, HabitTemplate, Goal, GoalTemplate, Notification, TelegramProfile

admin.site.register(HabitTemplate)
admin.site.register(GoalTemplate)
admin.site.register(Notification)

