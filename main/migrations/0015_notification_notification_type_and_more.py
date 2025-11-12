# Generated migration for streak reminder notifications

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0014_alter_habittemplate_frequency'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('general', 'General'),
                    ('streak_reminder', 'Streak Reminder'),
                    ('goal_reminder', 'Goal Reminder'),
                    ('habit_completion', 'Habit Completion'),
                    ('achievement', 'Achievement')
                ],
                default='general',
                max_length=50
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='telegram_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='notification',
            name='web_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='notification',
            name='scheduled_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='related_habit_id',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
