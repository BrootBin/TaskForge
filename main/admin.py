from django.contrib import admin
from django import forms
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.http import HttpResponseRedirect
from django.urls import reverse
from .models import (
    Habit, HabitTemplate, Goal, GoalTemplate, SubGoal,
    Notification, TelegramProfile, SubGoalTemplate
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

# Реєструємо моделі з адміністративними класами
admin.site.register(HabitTemplate, HabitTemplateAdmin)
admin.site.register(GoalTemplate, GoalTemplateAdmin)
admin.site.register(SubGoalTemplate, SubGoalTemplateAdmin)
admin.site.register(Notification)
admin.site.register(TelegramProfile)
admin.site.register(Habit)
admin.site.register(Goal)

