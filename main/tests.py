from main.tasks import send_2fa_request
from main.models import TelegramProfile

# знайти свій telegram_id
profile = TelegramProfile.objects.get(user__username="BrootBin")
telegram_id = profile.telegram_id

# викликати таск
send_2fa_request.delay(telegram_id, "BrootBin")
