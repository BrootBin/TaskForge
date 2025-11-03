from django.contrib import admin
from django import forms
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import (
    Habit, HabitTemplate, Goal, GoalTemplate, SubGoal,
    Notification, TelegramProfile, SubGoalTemplate, TechAdmin, SupportMessage, PendingPasswordReset
)

# Форма для створення шаблону цілі з підцілями
class GoalTemplateForm(forms.ModelForm):
    subgoal_names = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4}), 
        required=False,
        help_text="Введіть кожну підціль з нового рядка"
    )

    class Meta:
        model = GoalTemplate
        fields = ['name', 'description', 'subgoal_names']

# Форма для створення шаблону звички
class HabitTemplateForm(forms.ModelForm):
    class Meta:
        model = HabitTemplate
        fields = ['name', 'description', 'frequency']

# Адміністративний клас для шаблонів звичок
class HabitTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'frequency', 'description')
    search_fields = ('name', 'description')
    list_filter = ('frequency',)
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('add/', self.admin_site.admin_view(self.add_habit_template_view), name='main_habittemplate_add'),
        ]
        return custom_urls + urls
    
    @method_decorator(csrf_protect)
    def add_habit_template_view(self, request):
        if request.method == 'POST':
            form = HabitTemplateForm(request.POST)
            if form.is_valid():
                try:
                    # Створюємо шаблон звички
                    template = HabitTemplate.objects.create(
                        name=form.cleaned_data['name'],
                        description=form.cleaned_data['description'],
                        frequency=form.cleaned_data['frequency']
                    )
                    
                    self.message_user(request, 'Шаблон звички успішно створений')
                    return HttpResponseRedirect(reverse('admin:main_habittemplate_changelist'))
                except Exception as e:
                    # Логуємо помилку та додаємо повідомлення про помилку
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Помилка при створенні шаблону звички: {str(e)}")
                    self.message_user(request, f'Помилка при створенні шаблону звички: {str(e)}', level='error')
        else:
            form = HabitTemplateForm()
        
        # Додаємо CSRF-токен до контексту
        from django.middleware.csrf import get_token
        context = {
            'form': form,
            'title': 'Додати шаблон звички',
            'opts': self.model._meta,
            'csrf_token': get_token(request),
        }
        
        # Використовувати напряму render
        return render(request, 'admin/habittemplate_form.html', context)

# Клас адміністратора для підцілей шаблону
class SubGoalTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template')
    list_filter = ('template',)
    search_fields = ('name',)

# Inline для відображення підцілей всередині шаблону цілі
class SubGoalTemplateInline(admin.TabularInline):
    model = SubGoalTemplate
    extra = 1

# Адміністративний клас для шаблонів цілей
class GoalTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'get_subgoals_count')
    search_fields = ('name', 'description')
    inlines = [SubGoalTemplateInline]
    
    def get_subgoals_count(self, obj):
        return obj.subgoals.count()
    get_subgoals_count.short_description = 'Підцілі'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('add/', self.admin_site.admin_view(self.add_goal_template_view), name='main_goaltemplate_add'),
        ]
        return custom_urls + urls
    
    @method_decorator(csrf_protect)
    def add_goal_template_view(self, request):
        if request.method == 'POST':
            form = GoalTemplateForm(request.POST)
            if form.is_valid():
                try:
                    # Створюємо шаблон цілі
                    template = GoalTemplate.objects.create(
                        name=form.cleaned_data['name'],
                        description=form.cleaned_data['description']
                    )
                    
                    # Додаємо підцілі, якщо вони є
                    subgoal_text = form.cleaned_data.get('subgoal_names')
                    if subgoal_text:
                        for line in subgoal_text.strip().split('\n'):
                            subgoal_name = line.strip()
                            if subgoal_name:
                                SubGoalTemplate.objects.create(
                                    template=template,
                                    name=subgoal_name
                                )
                    
                    self.message_user(request, 'Шаблон цілі успішно створений')
                    return HttpResponseRedirect(reverse('admin:main_goaltemplate_changelist'))
                except Exception as e:
                    # Логуємо помилку та додаємо повідомлення про помилку
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Помилка при створенні шаблону: {str(e)}")
                    self.message_user(request, f'Помилка при створенні шаблону: {str(e)}', level='error')
        else:
            form = GoalTemplateForm()
        
        # Додаємо CSRF-токен до контексту
        from django.middleware.csrf import get_token
        context = {
            'form': form,
            'title': 'Додати шаблон цілі',
            'opts': self.model._meta,
            'csrf_token': get_token(request),
        }
        
        # Використовувати напряму render замість render_change_form
        return render(request, 'admin/goaltemplate_form.html', context)

# Кастомный админ для пользователей (для техадминов)
class TechAdminUserAdmin(UserAdmin):
    """Ограниченный доступ к пользователям для техадминов"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined')
    list_filter = ('is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('date_joined', 'last_login')
    
    def has_add_permission(self, request):
        # Техадмины не могут создавать пользователей
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        # Техадмины не могут удалять пользователей
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        # Техадмины могут только просматривать
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active
    
    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return self.readonly_fields
        # Для техадминов все поля только для чтения
        return [f.name for f in self.model._meta.fields]

# Админ для технических администраторов
class TechAdminAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_active', 'created_at', 'created_by')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at',)
    
    def save_model(self, request, obj, form, change):
        if not change:  # Только при создании
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def has_module_permission(self, request):
        # Только суперпользователи могут управлять техадминами
        return request.user.is_superuser

# Админ для сообщений поддержки
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'status', 'priority', 'created_at', 'assigned_to')
    list_filter = ('status', 'priority', 'problem_type', 'created_at')
    search_fields = ('user__username', 'subject', 'message')
    readonly_fields = ('created_at', 'updated_at', 'user_agent', 'ip_address')
    list_editable = ('status', 'priority')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'subject', 'message', 'status', 'priority')
        }),
        ('Детали проблемы', {
            'fields': ('problem_type', 'user_agent', 'ip_address')
        }),
        ('Обработка', {
            'fields': ('assigned_to', 'admin_notes', 'resolved_at')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active
    
    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active
    
    def has_add_permission(self, request):
        # Сообщения создаются только через интерфейс пользователя
        return False

# Ограниченный админ для TelegramProfile (для техадминов)
class TechAdminTelegramProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'telegram_id', 'connected', 'notifications_enabled', 'two_factor_enabled')
    list_filter = ('connected', 'notifications_enabled', 'two_factor_enabled')
    search_fields = ('user__username', 'telegram_id')
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active

# Переопределяем регистрацию пользователей только для техадминов
# Снимаем стандартную регистрацию User
admin.site.unregister(User)

# Регистрируем с кастомным админом
admin.site.register(User, TechAdminUserAdmin)

# Реєструємо моделі з адміністративними класами
admin.site.register(HabitTemplate, HabitTemplateAdmin)
admin.site.register(GoalTemplate, GoalTemplateAdmin)
admin.site.register(SubGoalTemplate, SubGoalTemplateAdmin)
admin.site.register(Notification)
admin.site.register(Habit)
admin.site.register(Goal)

# Новые модели для техподдержки
admin.site.register(TechAdmin, TechAdminAdmin)
admin.site.register(SupportMessage, SupportMessageAdmin)

# Password reset admin
@admin.register(PendingPasswordReset)
class PendingPasswordResetAdmin(admin.ModelAdmin):
    list_display = ('user', 'telegram_id', 'is_confirmed', 'created_at', 'expires_at', 'is_expired_display')
    list_filter = ('is_confirmed', 'created_at', 'expires_at')
    search_fields = ('user__username', 'telegram_id')
    readonly_fields = ('created_at', 'is_expired_display')
    
    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.short_description = 'Истекший'
    is_expired_display.boolean = True
    
    actions = ['cleanup_expired_resets']
    
    def cleanup_expired_resets(self, request, queryset):
        count = PendingPasswordReset.cleanup_expired()
        self.message_user(request, f'Удалено {count} истекших запросов на сброс пароля.')
    cleanup_expired_resets.short_description = 'Очистить истекшие запросы'

# Регистрируем TelegramProfile с ограниченными правами
admin.site.register(TelegramProfile, TechAdminTelegramProfileAdmin)

