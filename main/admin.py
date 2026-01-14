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
from django.contrib.admin import AdminSite
from .models import (
    Habit, HabitTemplate, Goal, GoalTemplate, SubGoal,
    Notification, TelegramProfile, SubGoalTemplate, TechAdmin, SupportMessage, PendingPasswordReset
)

# Кастомний AdminSite для дозволу доступу техадмін
class TaskForgeAdminSite(AdminSite):
    site_header = "TaskForge Administration"
    site_title = "TaskForge Admin"
    index_title = "Welcome to TaskForge Administration"
    
    def has_permission(self, request):
        # Дозволяємо доступ суперкористувачам та техадмінам
        return request.user.is_active and (
            request.user.is_superuser or 
            (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)
        )

# Створюємо глобальний екземпляр кастомного адмін сайту
admin_site = TaskForgeAdminSite(name='taskforge_admin')

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

# Кастомний адмін для користувачів (для техадмінів)
class TechAdminUserAdmin(UserAdmin):
    """Обмежений доступ до користувачів для техадмінів"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined')
    list_filter = ('is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('date_joined', 'last_login')
    
    def has_add_permission(self, request):
        # Техадміни не можуть створювати користувачів
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        # Техадміни не можуть видаляти користувачів
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        # Техадміни можуть тільки переглядати
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active
    
    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return self.readonly_fields
        # Для техадмінів усі поля лише для читання
        return [f.name for f in self.model._meta.fields]

# Адмін для технічних адміністраторів
class TechAdminAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_active', 'created_at', 'created_by')
    list_filter = ('is_active', 'created_at', 'user__email')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at',)
    autocomplete_fields = ['user']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_module_permission(self, request):
        return request.user.is_superuser or (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['user'].required = True
        return form

class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'status', 'priority', 'created_at', 'assigned_to', 'was_resolved')
    list_filter = ('status', 'priority', 'problem_type', 'created_at')
    search_fields = ('user__username', 'subject', 'message')
    readonly_fields = ('created_at', 'updated_at', 'user_agent', 'ip_address')
    list_editable = ('status', 'priority')
    ordering = ['-priority', '-created_at']

    fieldsets = (
        ('Main Info', {
            'fields': ('user', 'subject', 'message', 'status', 'priority')
        }),
        ('Problem Details', {
            'fields': ('problem_type', 'user_agent', 'ip_address')
        }),
        ('Processing', {
            'fields': ('assigned_to', 'admin_notes', 'resolved_at', 'was_resolved')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    

    def has_module_permission(self, request):
        return request.user.is_superuser or (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active

    def has_add_permission(self, request):
        return False
    
    def get_queryset(self, request):
        """Тех-адмін бачить тикети, крім was_resolved=True"""
        from django.db.models import Q
        from django.utils import timezone
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        if hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active:
            tech_admin = request.user.tech_admin
            now = timezone.now()
            queryset = queryset.filter(
                Q(assigned_to=tech_admin) | Q(status__in=['new', 'in_progress', 'resolved', 'closed'])
            ).exclude(resolved_at__gt=now).exclude(was_resolved=True)
        return queryset
    
    def save_model(self, request, obj, form, change):
        from django.utils import timezone
        now = timezone.now()
        error = None
        # Якщо техадмін не призначений, призначаємо поточного користувача якщо це техадмін
        if not obj.assigned_to and not request.user.is_superuser:
            if hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active:
                obj.assigned_to = request.user.tech_admin
        # Якщо проблема з TelegramProfile, виставляємо середній пріоритет
        if obj.problem_type == 'telegram_profile':
            obj.priority = 'medium'
        # Перевірка: не можна ставити дату виконання з майбутнього
        if obj.resolved_at and obj.resolved_at > now:
            error = "Resolved date cannot be in the future."
        # Перевірка: не можна поставити was_resolved=True якщо resolved_at не заповнено
        if obj.was_resolved and not obj.resolved_at:
            error = "You must set 'Resolved At' before marking as resolved."
        if error:
            self.message_user(request, error, level='error')
            return
        super().save_model(request, obj, form, change)

# Обмежений адмін для Telegram Profile (для техадмінів)
class TechAdminTelegramProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'telegram_id', 'connected', 'notifications_enabled', 'two_factor_enabled')
    list_filter = ('connected', 'notifications_enabled', 'two_factor_enabled')
    search_fields = ('user__username', 'telegram_id')
    
    def has_module_permission(self, request):
        return request.user.is_superuser or (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active

# Перевизначаємо реєстрацію користувачів тільки для техадмінів
# Знімаємо стандартну реєстрацію User
admin.site.unregister(User)

# Реєструємо з кастомним адміном на кастомному сайті
admin_site.register(User, TechAdminUserAdmin)

# Реєструємо моделі з адміністративними класами на кастомному сайті
admin_site.register(HabitTemplate, HabitTemplateAdmin)
admin_site.register(GoalTemplate, GoalTemplateAdmin)
admin_site.register(SubGoalTemplate, SubGoalTemplateAdmin)
admin_site.register(Notification)
admin_site.register(Habit)
admin_site.register(Goal)

# Нові моделі для техпідтримки
admin_site.register(TechAdmin, TechAdminAdmin)
admin_site.register(SupportMessage, SupportMessageAdmin)

# Password reset admin

class PendingPasswordResetAdmin(admin.ModelAdmin):
    def has_module_permission(self, request):
        return request.user.is_superuser or (hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active)
    list_display = ('user', 'telegram_id', 'is_confirmed', 'created_at', 'expires_at', 'is_expired_display')
    list_filter = ('is_confirmed', 'created_at', 'expires_at')
    search_fields = ('user__username', 'telegram_id')
    readonly_fields = ('created_at', 'is_expired_display')
    
    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.short_description = 'Expired'
    is_expired_display.boolean = True

    actions = ['cleanup_expired_resets']

    def cleanup_expired_resets(self, request, queryset):
        count = PendingPasswordReset.cleanup_expired()
        self.message_user(request, f'Removed {count} expired password reset requests.')
    cleanup_expired_resets.short_description = 'Clear expired requests'

admin_site.register(PendingPasswordReset, PendingPasswordResetAdmin)

# Реєструємо TelegramProfile з обмеженими правами
admin_site.register(TelegramProfile, TechAdminTelegramProfileAdmin)

