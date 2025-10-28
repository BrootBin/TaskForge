# Generated manually for telegram_message_id field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0005_subgoaltemplate'),
    ]

    operations = [
        migrations.AddField(
            model_name='pending2fa',
            name='telegram_message_id',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]