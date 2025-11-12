"""
Команда для создания технического администратора
Использование: python manage.py create_tech_admin <username>
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from main.models import TechAdmin


class Command(BaseCommand):
    help = 'Создает технического администратора из существующего пользователя'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Имя пользователя для создания техадмина')
        parser.add_argument(
            '--remove',
            action='store_true',
            help='Удалить роль техадмина вместо создания',
        )

    def handle(self, *args, **options):
        username = options['username']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'Пользователь с именем "{username}" не найден')

        if options['remove']:
            # Удаляем роль техадмина
            try:
                tech_admin = TechAdmin.objects.get(user=user)
                tech_admin.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Роль техадмина удалена для пользователя "{username}"')
                )
            except TechAdmin.DoesNotExist:
                raise CommandError(f'Пользователь "{username}" не является техадмином')
        else:
            # Создаем роль техадмина
            tech_admin, created = TechAdmin.objects.get_or_create(
                user=user,
                defaults={
                    'is_active': True,
                    'created_by': user
                }
            )
            
            # Устанавливаем is_staff=True для доступа к админке
            if not user.is_staff:
                user.is_staff = True
                user.save()
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Технический администратор "{username}" успешно создан!')
                )
                self.stdout.write(
                    self.style.SUCCESS(f'  Статус: активный')
                )
                self.stdout.write(
                    self.style.WARNING(
                        f'\nТеперь пользователь "{username}" может:' +
                        f'\n  - Входить в админ-панель' +
                        f'\n  - Просматривать сообщения техподдержки' +
                        f'\n  - Редактировать и закрывать тикеты' +
                        f'\n  - Просматривать информацию о пользователях'
                    )
                )
            else:
                # Уже существует
                if tech_admin.is_active:
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Пользователь "{username}" уже является активным техадмином')
                    )
                else:
                    # Активируем его
                    tech_admin.is_active = True
                    tech_admin.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Технический администратор "{username}" активирован')
                    )
